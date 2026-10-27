/**
 * HTTP data source — builds `UespInitData` without the MariaDB dumps.
 *
 * Flow:
 *   1. GET `https://en.uesp.net/wiki/Special:EsoBuildEditor` and read the inline
 *      `g_EsoBuildRules = {...}` JSON. `editBuild.class.php` serialises
 *      `rules` + `effects` + `computedStats` of the **current** rules version
 *      into the page (`GetBuildRulesJson()` → `{buildRulesJson}` template slot),
 *      so this is the same payload the live build editor computes with.
 *   2. GET the `cp2*`, `playerSkills` and `skillTree` tables from
 *      `esolog.uesp.net/exportJson.php`.
 *   3. Materialise the engine's SQLite schema (8 dump + 2 API tables) and run
 *      `extractGameData`
 *      — the exact same extraction used by `db:seed`, so the output is
 *      byte-comparable with the dump path.
 *
 * Trade-offs vs the dumps (see `docs/reference.md`):
 *   - always the **live** version; `exportJson.php` has no `?version=` pinning;
 *   - depends on the wiki page template (`{buildRulesJson}`) — validated below.
 *
 * The parser and the row mapping are pure and exported so they can be tested
 * offline (CI never hits the network).
 */

import { DatabaseSync } from 'node:sqlite';
import type { UespInitData } from '../eso-engine/index.js';
import { DEFAULT_USER_AGENT, fetchApiRows, sleep } from './api.js';
import { extractGameData } from './extract.js';
import { API_TABLES, DUMP_TABLES, createTableSql, insertSql, toSqlValue } from './schema.js';
import type { ColumnSpec, SeedProgressEvent, TableSpec } from './schema.js';

/** Live build editor page that carries the rules payload. */
export const EDITOR_PAGE_URL = 'https://en.uesp.net/wiki/Special:EsoBuildEditor';

/** Global assigned by the page (see `templates/esoeditbuild_embed_template.txt`). */
export const BUILD_RULES_MARKER = 'g_EsoBuildRules';

/** Global that records the live rules version on the same page. */
export const RULES_VERSION_MARKER = 'g_EsoBuildRealRulesVersion';

/** `cp2*` tables that come from the `cp` dump today and from the API here. */
export const CP_API_TABLES = [
  'cp2Skills',
  'cp2SkillDescriptions',
  'cp2Disciplines',
  'cp2ClusterRoots',
  'cp2SkillLinks',
] as const;

/** Minimum row counts below which the payload is considered truncated. */
export const MIN_PLAUSIBLE = { stats: 100, effects: 900, rules: 400 } as const;

const BATCH_SIZE = 500;
const API_RATE_LIMIT_MS = 500;
const RETRY_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Payload types (shape produced by `editBuild.class.php::GetBuildRulesJson()`)
// ---------------------------------------------------------------------------

/** One row of `effects` as serialised by the page. */
export type BuildRulesEffectRow = Record<string, unknown>;

/**
 * The `g_EsoBuildRules` object: one bucket per `ruleType`, plus the debug-only
 * `effects` array and `stats` map (computedStats keyed by numeric id).
 */
export interface BuildRulesPayload {
  [ruleType: string]: unknown;
}

export interface ParsedBuildRules {
  payload: BuildRulesPayload;
  /** `g_EsoBuildRealRulesVersion`, e.g. `"51"`. */
  pageVersion: string | null;
}

export interface RulesTableRows {
  ruleRows: Record<string, unknown>[];
  effectRows: Record<string, unknown>[];
  statRows: Record<string, unknown>[];
  /** Rules version shared by every row (`"51"`). */
  version: string;
  counts: { rules: number; effects: number; stats: number };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the `g_EsoBuildRules` JSON object from the build editor page.
 *
 * Brace-scans instead of `JSON.parse(html.slice(...))` because the object is
 * embedded in an assignment (`g_EsoBuildRules = {...};`) and can contain braces,
 * quotes and escapes inside strings.
 */
export function parseBuildRulesHtml(html: string): ParsedBuildRules {
  // Tolerates `g_EsoBuildRules = {`, `g_EsoBuildRules={`, `var g_EsoBuildRules = {` …
  const marker = new RegExp(`${BUILD_RULES_MARKER}\\s*=\\s*\\{`).exec(html);
  if (!marker) {
    throw new Error(
      `[fetch-http] '${BUILD_RULES_MARKER} = {' not found in the page — the UESP template changed?`,
    );
  }
  const start = marker.index + marker[0].length - 1;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`[fetch-http] unterminated '${BUILD_RULES_MARKER}' object`);

  const raw = html.slice(start, end);
  let payload: BuildRulesPayload;
  try {
    payload = JSON.parse(raw) as BuildRulesPayload;
  } catch (err) {
    throw new Error(`[fetch-http] failed to parse '${BUILD_RULES_MARKER}': ${String(err)}`);
  }

  const versionMatch = new RegExp(`${RULES_VERSION_MARKER}\\s*=\\s*["']([^"']+)["']`).exec(html);
  return { payload, pageVersion: versionMatch?.[1] ?? null };
}

function isRuleBucket(value: unknown): value is Record<string, Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Maps the page payload into rows shaped like the `buildEditor` dump columns.
 *
 * Differences handled here: booleans → `1`/`0` (SQLite), `round` → `roundNum`
 * (the page renames the column), `compute` kept as the original JSON string.
 */
export function buildRulesToTableRows(payload: BuildRulesPayload): RulesTableRows {
  const rulesSpec = tableSpec('rules');
  const effectsSpec = tableSpec('effects');
  const statsSpec = tableSpec('computedStats');

  const ruleRows: Record<string, unknown>[] = [];
  const ruleIds = new Set<string>();
  let version: string | null = null;

  for (const [ruleType, bucket] of Object.entries(payload)) {
    if (ruleType === 'effects' || ruleType === 'stats') continue;
    if (!isRuleBucket(bucket)) continue;
    for (const rule of Object.values(bucket)) {
      const row: Record<string, unknown> = { ...rule, ruleType: rule.ruleType ?? ruleType };
      delete row.effects;
      ruleIds.add(String(row.id));
      if (typeof row.version === 'string' && row.version) version ??= row.version;
      ruleRows.push(pickColumns(row, rulesSpec.columns));
    }
  }

  const effects = Array.isArray(payload.effects) ? (payload.effects as BuildRulesEffectRow[]) : [];
  const effectRows = effects.map((effect) => {
    const row: Record<string, unknown> = {
      ...effect,
      roundNum: effect.roundNum ?? effect.round ?? '',
    };
    return pickColumns(row, effectsSpec.columns);
  });

  const stats = isRuleBucket(payload.stats as unknown)
    ? (payload.stats as Record<string, unknown>)
    : {};
  const statRows = Object.values(stats).map((stat) => {
    const row = { ...(stat as Record<string, unknown>) };
    if (typeof row.compute !== 'string') row.compute = JSON.stringify(row.compute ?? []);
    return pickColumns(row, statsSpec.columns);
  });

  if (!version) {
    const fromStats = statRows.find((row) => typeof row.version === 'string' && row.version);
    version = fromStats ? String(fromStats.version) : null;
  }
  if (!version)
    throw new Error('[fetch-http] could not determine the rules version from the payload');

  const counts = { rules: ruleRows.length, effects: effectRows.length, stats: statRows.length };
  assertEffectLinks(effectRows, ruleIds);
  assertSingleVersion([...ruleRows, ...effectRows, ...statRows], version);

  return { ruleRows, effectRows, statRows, version, counts };
}

function pickColumns(row: Record<string, unknown>, columns: readonly ColumnSpec[]) {
  const out: Record<string, unknown> = {};
  for (const [name] of columns) out[name] = toSqlValue(row[name]);
  return out;
}

function tableSpec(tableName: string): TableSpec {
  const spec = DUMP_TABLES.find((entry) => entry.tableName === tableName);
  if (!spec) throw new Error(`[fetch-http] missing table spec for '${tableName}'`);
  return spec;
}

function assertEffectLinks(effectRows: Record<string, unknown>[], ruleIds: Set<string>): void {
  const orphans = effectRows.filter((effect) => !ruleIds.has(String(effect.ruleId)));
  if (orphans.length > 0) {
    throw new Error(
      `[fetch-http] ${orphans.length} effect(s) reference rules missing from the payload ` +
        `(first ruleId=${String(orphans[0].ruleId)}) — truncated payload?`,
    );
  }
}

function assertSingleVersion(rows: Record<string, unknown>[], version: string): void {
  const mismatch = rows.find((row) => row.version != null && String(row.version) !== version);
  if (mismatch) {
    throw new Error(
      `[fetch-http] payload mixes rules versions: expected '${version}', found '${String(mismatch.version)}'`,
    );
  }
}

/**
 * Rejects truncated payloads before they reach the engine — a silent partial
 * ruleset would produce wrong stats instead of an error.
 */
export function assertPlausible(
  rules: Pick<RulesTableRows, 'counts' | 'version'>,
  minimums: { stats: number; effects: number; rules: number } = MIN_PLAUSIBLE,
): void {
  if (!/^\d+(pts)?$/.test(rules.version)) {
    throw new Error(`[fetch-http] unexpected rules version '${rules.version}'`);
  }
  const checks: Array<[keyof typeof minimums, number]> = [
    ['stats', rules.counts.stats],
    ['effects', rules.counts.effects],
    ['rules', rules.counts.rules],
  ];
  for (const [name, actual] of checks) {
    if (actual < minimums[name]) {
      throw new Error(
        `[fetch-http] only ${actual} ${name} (expected at least ${minimums[name]}) — refusing to write a partial dataset`,
      );
    }
  }
}

/**
 * Fails closed when `exportJson.php` stops returning a column the specs expect —
 * a silently missing `abilityId` would degrade `skillsData` without an error.
 */
export function assertApiColumns(spec: TableSpec, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const missing = spec.columns.map(([name]) => name).filter((name) => !(name in rows[0]));
  if (missing.length > 0) {
    throw new Error(
      `[fetch-http] API table '${spec.tableName}' is missing columns: ${missing.join(', ')}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface HttpSourceOptions {
  /** Page that carries the rules payload. */
  pageUrl?: string;
  /** Pre-fetched page HTML (tests / offline runs). */
  html?: string;
  /** Base URL of `exportJson.php`. */
  apiBaseUrl?: string;
  userAgent?: string;
  /** Skip the API fetch (skillsData/cpSkillsData come out empty). */
  skipApi?: boolean;
  onProgress?: (event: SeedProgressEvent) => void;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** Abort in-flight requests (page and API). */
  signal?: AbortSignal;
  /** Pause between API table fetches; defaults to 500 ms. */
  apiRateLimitMs?: number;
  /** Payload thresholds; defaults to {@link MIN_PLAUSIBLE}. */
  minimums?: { stats: number; effects: number; rules: number };
}

export interface HttpBuildResult {
  initData: UespInitData;
  version: string;
  counts: Record<string, number>;
  meta: {
    source: 'http';
    pageUrl: string;
    fetchedAt: string;
    pageBytes: number;
    rules: number;
    effects: number;
    stats: number;
  };
}

/** Downloads the build editor page (retries once). Exported for the CLI/audit flow. */
export async function fetchEditorPage(options: HttpSourceOptions = {}): Promise<string> {
  return fetchText(options.pageUrl ?? EDITOR_PAGE_URL, options);
}

async function fetchText(url: string, options: HttpSourceOptions): Promise<string> {
  const { userAgent = DEFAULT_USER_AGENT, fetchImpl = fetch, signal } = options;
  const init: RequestInit = { headers: { 'User-Agent': userAgent }, signal };

  let res: Response;
  try {
    res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
  } catch (err) {
    if (signal?.aborted) throw err;
    await sleep(RETRY_DELAY_MS);
    res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }
  return res.text();
}

function insertRows(
  db: DatabaseSync,
  spec: TableSpec,
  rows: Record<string, unknown>[],
  onProgress: (event: SeedProgressEvent) => void,
  numericCols?: ReadonlySet<string>,
): void {
  const stmt = db.prepare(insertSql(spec));
  const columns = spec.columns.map(([name]) => name);

  db.exec('BEGIN');
  try {
    for (let i = 0; i < rows.length; i++) {
      stmt.run(
        ...columns.map((name) => {
          const value = rows[i][name];
          if (value == null) return null;
          // Mirror `seed.ts` (dump path) exactly: numeric API columns are coerced
          // with `Number()`, never left to SQLite type affinity.
          return numericCols?.has(name) ? Number(value) : toSqlValue(value);
        }),
      );
      if ((i + 1) % BATCH_SIZE === 0) {
        onProgress({ table: spec.tableName, kind: 'rows', rows: i + 1 });
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  onProgress({ table: spec.tableName, kind: 'done', rows: rows.length });
}

/**
 * Runs the full HTTP pipeline: build editor page + `exportJson.php` → `UespInitData`.
 * The SQLite database is created in memory and discarded at the end.
 */
export async function buildUespGameDataFromHttp(
  options: HttpSourceOptions = {},
): Promise<HttpBuildResult> {
  const {
    pageUrl = EDITOR_PAGE_URL,
    html,
    skipApi = false,
    onProgress = () => {},
    apiRateLimitMs = API_RATE_LIMIT_MS,
    minimums = MIN_PLAUSIBLE,
  } = options;

  const fetchedAt = new Date().toISOString();

  onProgress({ table: 'g_EsoBuildRules', kind: 'start', detail: pageUrl });
  const pageHtml = html ?? (await fetchText(pageUrl, options));
  const { payload, pageVersion } = parseBuildRulesHtml(pageHtml);
  const rules = buildRulesToTableRows(payload);
  assertPlausible(rules, minimums);
  if (pageVersion && pageVersion !== rules.version) {
    throw new Error(
      `[fetch-http] page reports rules version '${pageVersion}' but the payload rows say '${rules.version}'`,
    );
  }
  onProgress({
    table: 'g_EsoBuildRules',
    kind: 'done',
    rows: rules.counts.rules,
    detail: `version ${rules.version}`,
  });

  const db = new DatabaseSync(':memory:');
  const counts: Record<string, number> = {
    rules: rules.counts.rules,
    effects: rules.counts.effects,
    computedStats: rules.counts.stats,
  };

  try {
    for (const spec of DUMP_TABLES) db.exec(createTableSql(spec));
    for (const spec of API_TABLES) db.exec(createTableSql(spec));
    db.exec('CREATE INDEX idx_effects_ruleId ON effects(ruleId)');

    insertRows(db, tableSpec('rules'), rules.ruleRows, onProgress);
    insertRows(db, tableSpec('effects'), rules.effectRows, onProgress);
    insertRows(db, tableSpec('computedStats'), rules.statRows, onProgress);

    const apiTables = skipApi
      ? []
      : [...API_TABLES, ...CP_API_TABLES.map((name) => tableSpec(name))];

    for (const spec of apiTables) {
      const apiTable =
        API_TABLES.find((entry) => entry.tableName === spec.tableName)?.apiTable ?? spec.tableName;
      onProgress({ table: spec.tableName, kind: 'start', detail: `API: ${apiTable}` });
      const rows = await fetchApiRows(apiTable, {
        baseUrl: options.apiBaseUrl,
        userAgent: options.userAgent,
        fetchImpl: options.fetchImpl,
      });
      assertApiColumns(spec, rows);
      const numericCols = API_TABLES.find(
        (entry) => entry.tableName === spec.tableName,
      )?.numericCols;
      insertRows(db, spec, rows, onProgress, new Set(numericCols));
      counts[spec.tableName] = rows.length;
      if (apiRateLimitMs > 0) await sleep(apiRateLimitMs);
    }

    for (const spec of skipApi
      ? [...API_TABLES, ...CP_API_TABLES.map((name) => tableSpec(name))]
      : []) {
      onProgress({ table: spec.tableName, kind: 'skip' });
    }

    const initData = extractGameData(db, rules.version);
    return {
      initData,
      version: rules.version,
      counts,
      meta: {
        source: 'http',
        pageUrl,
        fetchedAt,
        pageBytes: pageHtml.length,
        rules: rules.counts.rules,
        effects: rules.counts.effects,
        stats: rules.counts.stats,
      },
    };
  } finally {
    db.close();
  }
}
