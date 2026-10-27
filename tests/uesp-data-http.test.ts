/**
 * Tests for the HTTP data source (`fetch-http`).
 *
 * Everything here runs offline: the page payload is synthesised and the
 * `exportJson.php` responses are mocked. Network behaviour lives in the CLI.
 */

import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  assertPlausible,
  buildRulesToTableRows,
  buildUespGameDataFromHttp,
  extractGameData,
  parseBuildRulesHtml,
} from '../src/lib/uesp-data';
import { assertApiColumns } from '../src/lib/uesp-data/http-source';
import {
  API_TABLES,
  DUMP_TABLES,
  createTableSql,
  insertSql,
  toSqlValue,
} from '../src/lib/uesp-data/schema';

/** Minimal build editor page carrying the inline rules payload. */
function pageHtml(payload: unknown, version = '99'): string {
  return [
    '<html><head><title>ESO Build Editor</title></head><body><script>',
    `\tg_EsoBuildRealRulesVersion = "${version}";`,
    `\tg_EsoBuildRules = ${JSON.stringify(payload)};`,
    '\tg_EsoBuildPtsRulesVersion = "99pts";',
    '</script></body></html>',
  ].join('\n');
}

const RULE = {
  id: 1,
  ruleId: 1,
  version: '99',
  ruleType: 'buff',
  nameId: 'Test Buff',
  displayName: 'Test Buff',
  matchRegex: '/Test Buff/i',
  displayRegex: null,
  statRequireId: '',
  statRequireValue: '',
  factorStatId: '',
  isEnabled: true,
  isVisible: true,
  isToggle: false,
  enableOffBar: false,
  originalId: '',
  icon: '',
  groupName: 'Set',
  maxTimes: null,
  comment: '',
  description: 'braces { } and "quotes" and a backslash \\ inside the string',
  customData: '{}',
  effects: [
    {
      id: '10',
      ruleId: '1',
      version: '99',
      statId: 'SpellCrit',
      value: '1314',
      display: '',
      category: 'Set',
      combineAs: '',
      factorValue: null,
      statDesc: '',
      buffId: '',
      regexVar: '',
      effectId: 10,
      round: '',
    },
  ],
};

const STAT = {
  id: '100',
  statId: 'SpellCrit',
  version: '99',
  title: 'Spell Critical',
  roundNum: 'floor',
  addClass: '',
  comment: '',
  minimumValue: null,
  maximumValue: null,
  deferLevel: null,
  display: '',
  compute: '["Skill.SpellCrit"]',
  idx: '0',
  category: 'basic',
  suffix: '',
  dependsOn: '',
};

const payload = (overrides: Record<string, unknown> = {}) => ({
  buff: { 1: RULE },
  effects: RULE.effects,
  stats: { 100: STAT },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

describe('parseBuildRulesHtml', () => {
  it('extracts the payload and the page version', () => {
    const { payload: parsed, pageVersion } = parseBuildRulesHtml(pageHtml(payload()));
    expect(pageVersion).toBe('99');
    expect((parsed.stats as Record<string, typeof STAT>)['100'].statId).toBe('SpellCrit');
  });

  it('brace-scans strings with braces, quotes and escapes', () => {
    const { payload: parsed } = parseBuildRulesHtml(pageHtml(payload()));
    const rule = (parsed.buff as Record<string, typeof RULE>)['1'];
    expect(rule.description).toBe(RULE.description);
  });

  it('tolerates a minified assignment without spaces', () => {
    const html = pageHtml(payload()).replace('g_EsoBuildRules = {', 'g_EsoBuildRules={');
    expect(parseBuildRulesHtml(html).pageVersion).toBe('99');
  });

  it('throws when the marker is missing (template changed)', () => {
    expect(() => parseBuildRulesHtml('<html>nothing here</html>')).toThrow(/not found/);
  });

  it('throws on truncated JSON', () => {
    const html = pageHtml(payload());
    const start = html.indexOf('g_EsoBuildRules = ');
    const truncated = html.slice(0, start + 'g_EsoBuildRules = '.length + 5);
    expect(() => parseBuildRulesHtml(truncated)).toThrow(/unterminated|failed to parse/);
  });
});

// ---------------------------------------------------------------------------
// Payload → dump-shaped rows
// ---------------------------------------------------------------------------

describe('buildRulesToTableRows', () => {
  it('maps the payload to dump-shaped rows', () => {
    const { ruleRows, effectRows, statRows, version, counts } = buildRulesToTableRows(payload());

    expect(version).toBe('99');
    expect(counts).toEqual({ rules: 1, effects: 1, stats: 1 });

    // booleans → 1/0 for SQLite
    expect(ruleRows[0].isEnabled).toBe(1);
    expect(ruleRows[0].isToggle).toBe(0);
    // `effects` is a relation, not a rule column
    expect(ruleRows[0].effects).toBeUndefined();

    // the page renames `round` → `roundNum`
    expect(effectRows[0].roundNum).toBe('');
    expect(effectRows[0].round).toBeUndefined();

    // compute stays a JSON string (same as the dump column)
    expect(statRows[0].compute).toBe('["Skill.SpellCrit"]');
    expect(statRows[0].roundNum).toBe('floor');
  });

  it('stringifies a compute that arrives as an array', () => {
    const rows = buildRulesToTableRows(
      payload({ stats: { 100: { ...STAT, compute: ['Skill.SpellCrit', '*'] } } }),
    );
    expect(rows.statRows[0].compute).toBe('["Skill.SpellCrit","*"]');
  });

  it('infers the version from the rows when the global is absent', () => {
    const html = pageHtml(payload()).replace('g_EsoBuildRealRulesVersion = "99";', '');
    const { payload: parsed, pageVersion } = parseBuildRulesHtml(html);
    expect(pageVersion).toBeNull();
    expect(buildRulesToTableRows(parsed).version).toBe('99');
  });

  it('rejects effects pointing at rules that are not in the payload', () => {
    const orphan = { ...RULE.effects[0], id: '11', ruleId: '999' };
    expect(() => buildRulesToTableRows(payload({ effects: [...RULE.effects, orphan] }))).toThrow(
      /reference rules missing/,
    );
  });

  it('rejects a payload that mixes rules versions', () => {
    const older = { ...STAT, version: '98' };
    expect(() => buildRulesToTableRows(payload({ stats: { 100: STAT, 101: older } }))).toThrow(
      /mixes rules versions/,
    );
  });
});

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

describe('assertPlausible', () => {
  it('rejects truncated datasets', () => {
    expect(() =>
      assertPlausible({ counts: { rules: 1, effects: 1, stats: 1 }, version: '99' }),
    ).toThrow(/partial dataset/);
  });

  it('accepts a dataset above the thresholds', () => {
    expect(() =>
      assertPlausible({ counts: { rules: 400, effects: 900, stats: 100 }, version: '51' }),
    ).not.toThrow();
  });

  it('rejects a non-numeric rules version', () => {
    expect(() =>
      assertPlausible({ counts: { rules: 400, effects: 900, stats: 100 }, version: 'Live' }),
    ).toThrow(/unexpected rules version/);
  });
});

// ---------------------------------------------------------------------------
// Orchestrator (offline, API mocked)
// ---------------------------------------------------------------------------

/** Fills every column of a spec so the row matches what `exportJson.php` returns. */
function apiRow(tableName: string, values: Record<string, string>): Record<string, string> {
  const spec = [...API_TABLES, ...DUMP_TABLES].find((entry) => entry.tableName === tableName);
  if (!spec) throw new Error(`unknown table ${tableName}`);
  const row: Record<string, string> = {};
  for (const [name] of spec.columns) row[name] = values[name] ?? '';
  return row;
}

function mockApi(
  rows: Record<string, Record<string, string>[]>,
): (input: string | URL | Request) => Promise<Response> {
  return async (input) => {
    const table = new URL(String(input)).searchParams.get('table') ?? '';
    const tableRows = rows[table] ?? [];
    return new Response(JSON.stringify({ numRecords: tableRows.length, [table]: tableRows }), {
      headers: { 'content-type': 'application/json' },
    });
  };
}

const API_ROWS = {
  playerSkills: [
    apiRow('playerSkills', { id: '100', displayId: '100', name: 'Test Skill', isPassive: '0' }),
  ],
  skillTree: [
    apiRow('skillTree', {
      id: '1',
      abilityId: '100',
      displayId: '100',
      skillTypeName: 'Test::Line',
      baseName: 'Test Base',
      name: 'Test Skill',
      maxRank: '4',
      rank: '4',
    }),
  ],
  cp2Skills: [],
  cp2SkillDescriptions: [],
  cp2Disciplines: [],
  cp2ClusterRoots: [],
  cp2SkillLinks: [],
};

describe('buildUespGameDataFromHttp (offline)', () => {
  it('materialises the dataset and joins effects onto their rules', async () => {
    const result = await buildUespGameDataFromHttp({
      html: pageHtml(payload()),
      fetchImpl: mockApi(API_ROWS) as typeof fetch,
      apiRateLimitMs: 0,
      minimums: { stats: 1, effects: 1, rules: 1 },
    });

    expect(result.version).toBe('99');
    expect(result.meta.source).toBe('http');

    const buildRules = result.initData.buildRules as Record<
      string,
      Record<string, { effects: unknown[] }>
    >;
    expect(buildRules.buff['1'].effects).toHaveLength(1);

    const stats = result.initData.computedStats as Record<
      string,
      { round?: string; compute?: unknown }
    >;
    expect(stats.SpellCrit.round).toBe('floor');
    expect(stats.SpellCrit.compute).toEqual(['Skill.SpellCrit']);

    // counts are keyed by table name, like `db:seed`
    expect(result.counts.computedStats).toBe(1);
    expect(result.counts.playerSkills).toBe(1);
  });

  it('joins playerSkills with skillTree on the numeric abilityId', async () => {
    const result = await buildUespGameDataFromHttp({
      html: pageHtml(payload()),
      fetchImpl: mockApi(API_ROWS) as typeof fetch,
      apiRateLimitMs: 0,
      minimums: { stats: 1, effects: 1, rules: 1 },
    });

    const skills = result.initData.skillsData as Record<
      string,
      { id?: string; skillTypeName?: string; baseName?: string; maxRank?: string }
    >;
    expect(skills['100'].skillTypeName).toBe('Test::Line');
    expect(skills['100'].baseName).toBe('Test Base');
    expect(skills['100'].maxRank).toBe('4');
  });

  it('produces the same UespInitData as dump-shaped rows (equivalence)', async () => {
    const httpInit = (
      await buildUespGameDataFromHttp({
        html: pageHtml(payload()),
        skipApi: true,
        minimums: { stats: 1, effects: 1, rules: 1 },
      })
    ).initData;

    // Same data, but written the way `db:seed` writes it (dump column names,
    // 1/0 flags, `roundNum` instead of `round`, everything else as strings).
    const db = new DatabaseSync(':memory:');
    try {
      for (const spec of [...DUMP_TABLES, ...API_TABLES]) db.exec(createTableSql(spec));

      const insert = (tableName: string, rows: Record<string, unknown>[]) => {
        const spec = DUMP_TABLES.find((entry) => entry.tableName === tableName);
        if (!spec) throw new Error(`unknown table ${tableName}`);
        const stmt = db.prepare(insertSql(spec));
        const columns = spec.columns.map(([name]) => name);
        for (const row of rows) stmt.run(...columns.map((name) => toSqlValue(row[name])));
      };

      const { effects, ...rule } = RULE;
      insert('rules', [{ ...rule, isEnabled: 1, isVisible: 1, isToggle: 0, enableOffBar: 0 }]);
      insert(
        'effects',
        effects.map(({ round: _round, effectId, ...effect }) => ({ ...effect, effectId })),
      );
      insert('computedStats', [STAT]);

      expect(extractGameData(db, '99')).toEqual(httpInit);
    } finally {
      db.close();
    }
  });

  it('fails closed on a truncated payload', async () => {
    await expect(
      buildUespGameDataFromHttp({ html: pageHtml(payload()), skipApi: true }),
    ).rejects.toThrow(/partial dataset/);
  });

  it('fails when the page version and the payload version disagree', async () => {
    await expect(
      buildUespGameDataFromHttp({
        html: pageHtml(payload(), '98'),
        skipApi: true,
        minimums: { stats: 1, effects: 1, rules: 1 },
      }),
    ).rejects.toThrow(/payload rows say/);
  });
});

describe('assertApiColumns', () => {
  it('rejects an API table that lost a column', () => {
    const skillTree = DUMP_TABLES.find((entry) => entry.tableName === 'skillTree');
    const spec = API_TABLES.find((entry) => entry.tableName === 'skillTree');
    expect(skillTree).toBeUndefined(); // skillTree is API-only
    expect(spec).toBeDefined();
    const [row] = API_ROWS.skillTree;
    const { abilityId: _missing, ...withoutAbilityId } = row;
    expect(() => assertApiColumns(spec!, [withoutAbilityId])).toThrow(/missing columns: abilityId/);
  });

  it('accepts an empty table (nothing to validate)', () => {
    const spec = API_TABLES.find((entry) => entry.tableName === 'skillTree');
    expect(() => assertApiColumns(spec!, [])).not.toThrow();
  });
});
