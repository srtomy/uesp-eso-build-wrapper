/**
 * Pipeline de dados do wrapper: dumps MariaDB + API UESP → `UespInitData`.
 *
 * Fluxo (uma função, sem estado persistente):
 *   1. Localiza os dumps (`buildEditor*.sql.gz`, `cp*.sql.gz`) em `dumpDir`
 *   2. Cria um banco SQLite **em memória** com o schema das 7 tabelas da engine
 *   3. Popula as 5 tabelas de dump em streaming (parser MariaDB)
 *   4. Popula `playerSkills` + `skillTree` via API UESP (retry + rate limit)
 *   5. Roda `extractGameData` e devolve o `UespInitData`
 *
 * Escopo engine-only: nada aqui considera as tabelas auxiliares do
 * eso-build-editor (setSummary, minedItemSummary, skillTooltips, ...).
 */

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import type { UespInitData } from '../eso-engine/index.js';
import { assertCols, findDumpFile, iterateDumpRows } from './mariadb-dump.js';
import { extractGameData } from './extract.js';

// ---------------------------------------------------------------------------
// Schema das tabelas (ordem posicional = ordem das colunas nos dumps)
// ---------------------------------------------------------------------------

export type SqlType = 'INTEGER' | 'TEXT' | 'REAL';
export type ColumnSpec = readonly [name: string, type: SqlType];

interface TableSpec {
  tableName: string;
  columns: readonly ColumnSpec[];
}

interface DumpTableSpec extends TableSpec {
  dumpPrefix: 'buildEditor' | 'cp';
}

interface ApiTableSpec extends TableSpec {
  apiTable: string;
  /** Colunas numéricas da API (replicam o `Number()` do seed de referência). */
  numericCols: readonly string[];
}

const DUMP_TABLES: readonly DumpTableSpec[] = [
  {
    tableName: 'rules',
    dumpPrefix: 'buildEditor',
    columns: [
      ['id', 'INTEGER'],
      ['version', 'TEXT'],
      ['ruleType', 'TEXT'],
      ['nameId', 'TEXT'],
      ['displayName', 'TEXT'],
      ['matchRegex', 'TEXT'],
      ['displayRegex', 'TEXT'],
      ['statRequireId', 'TEXT'],
      ['statRequireValue', 'TEXT'],
      ['factorStatId', 'TEXT'],
      ['isEnabled', 'INTEGER'],
      ['isVisible', 'INTEGER'],
      ['isToggle', 'INTEGER'],
      ['enableOffBar', 'INTEGER'],
      ['originalId', 'TEXT'],
      ['icon', 'TEXT'],
      ['groupName', 'TEXT'],
      ['maxTimes', 'INTEGER'],
      ['comment', 'TEXT'],
      ['description', 'TEXT'],
      ['customData', 'TEXT'],
    ],
  },
  {
    tableName: 'effects',
    dumpPrefix: 'buildEditor',
    columns: [
      ['id', 'INTEGER'],
      ['ruleId', 'INTEGER'],
      ['version', 'TEXT'],
      ['statId', 'TEXT'],
      ['value', 'TEXT'],
      ['display', 'TEXT'],
      ['category', 'TEXT'],
      ['combineAs', 'TEXT'],
      ['roundNum', 'TEXT'],
      ['factorValue', 'REAL'],
      ['statDesc', 'TEXT'],
      ['buffId', 'TEXT'],
      ['regexVar', 'TEXT'],
    ],
  },
  {
    tableName: 'computedStats',
    dumpPrefix: 'buildEditor',
    columns: [
      ['id', 'INTEGER'],
      ['statId', 'TEXT'],
      ['version', 'TEXT'],
      ['title', 'TEXT'],
      ['roundNum', 'TEXT'],
      ['addClass', 'TEXT'],
      ['comment', 'TEXT'],
      ['minimumValue', 'REAL'],
      ['maximumValue', 'REAL'],
      ['deferLevel', 'INTEGER'],
      ['display', 'TEXT'],
      ['compute', 'TEXT'],
      ['idx', 'INTEGER'],
      ['category', 'TEXT'],
      ['suffix', 'TEXT'],
      ['dependsOn', 'TEXT'],
    ],
  },
  {
    tableName: 'cp2Skills',
    dumpPrefix: 'cp',
    columns: [
      ['id', 'INTEGER'],
      ['skillId', 'INTEGER'],
      ['parentSkillId', 'INTEGER'],
      ['abilityId', 'INTEGER'],
      ['disciplineIndex', 'INTEGER'],
      ['disciplineId', 'INTEGER'],
      ['skillIndex', 'INTEGER'],
      ['name', 'TEXT'],
      ['skillType', 'INTEGER'],
      ['minDescription', 'TEXT'],
      ['maxDescription', 'TEXT'],
      ['maxValue', 'REAL'],
      ['isRoot', 'INTEGER'],
      ['isClusterRoot', 'INTEGER'],
      ['maxPoints', 'INTEGER'],
      ['jumpPoints', 'TEXT'],
      ['jumpPointDelta', 'INTEGER'],
      ['numJumpPoints', 'INTEGER'],
      ['x', 'REAL'],
      ['y', 'REAL'],
      ['a', 'REAL'],
      ['b', 'REAL'],
      ['c', 'REAL'],
      ['d', 'REAL'],
      ['r2', 'REAL'],
      ['fitDescription', 'TEXT'],
    ],
  },
  {
    tableName: 'cp2SkillDescriptions',
    dumpPrefix: 'cp',
    columns: [
      ['id', 'INTEGER'],
      ['abilityId', 'INTEGER'],
      ['skillId', 'INTEGER'],
      ['points', 'INTEGER'],
      ['description', 'TEXT'],
    ],
  },
];

const PLAYER_SKILLS_TEXT_COLUMNS = [
  'name',
  'indexName',
  'description',
  'descHeader',
  'target',
  'skillType',
  'upgradeLines',
  'effectLines',
  'duration',
  'startTime',
  'tickTime',
  'cooldown',
  'cost',
  'costTime',
  'baseCost',
  'baseMechanic',
  'baseIsCostTime',
  'chargeFreq',
  'minRange',
  'maxRange',
  'radius',
  'isPassive',
  'isChanneled',
  'isPermanent',
  'isCrafted',
  'craftedId',
  'castTime',
  'channelTime',
  'angleDistance',
  'mechanic',
  'mechanicTime',
  'texture',
  'isPlayer',
  'raceType',
  'classType',
  'setName',
  'skillLine',
  'prevSkill',
  'nextSkill',
  'nextSkill2',
  'baseAbilityId',
  'learnedLevel',
  'rank',
  'morph',
  'skillIndex',
  'buffType',
  'isToggle',
  'numCoefVars',
  'coefDescription',
  'type1',
  'a1',
  'b1',
  'c1',
  'R1',
  'avg1',
  'type2',
  'a2',
  'b2',
  'c2',
  'R2',
  'avg2',
  'type3',
  'a3',
  'b3',
  'c3',
  'R3',
  'avg3',
  'type4',
  'a4',
  'b4',
  'c4',
  'R4',
  'avg4',
  'type5',
  'a5',
  'b5',
  'c5',
  'R5',
  'avg5',
  'type6',
  'a6',
  'b6',
  'c6',
  'R6',
  'avg6',
  'rawDescription',
  'rawName',
  'rawTooltip',
  'rawCoef',
  'coefTypes',
  'isMastery',
] as const;

const API_TABLES: readonly ApiTableSpec[] = [
  {
    tableName: 'playerSkills',
    apiTable: 'playerSkills',
    numericCols: ['id', 'displayId'],
    columns: [
      ['id', 'INTEGER'],
      ['displayId', 'INTEGER'],
      ...PLAYER_SKILLS_TEXT_COLUMNS.map((name) => [name, 'TEXT'] as const),
    ],
  },
  {
    tableName: 'skillTree',
    apiTable: 'skillTree',
    numericCols: ['id', 'abilityId', 'displayId'],
    columns: [
      ['id', 'INTEGER'],
      ['abilityId', 'INTEGER'],
      ['displayId', 'INTEGER'],
      ['skillTypeName', 'TEXT'],
      ['learnedLevel', 'TEXT'],
      ['maxRank', 'TEXT'],
      ['rank', 'TEXT'],
      ['baseName', 'TEXT'],
      ['name', 'TEXT'],
      ['description', 'TEXT'],
      ['type', 'TEXT'],
      ['cost', 'TEXT'],
      ['icon', 'TEXT'],
      ['skillIndex', 'TEXT'],
    ],
  },
];

// ---------------------------------------------------------------------------
// API UESP
// ---------------------------------------------------------------------------

const API_BASE = 'http://esolog.uesp.net/exportJson.php';
// identificação educada junto ao UESP (mesma do seed de referência)
const API_UA = 'Mozilla/5.0 (compatible; esobuildhub.com contact: tarcisioscotta2@gmail.com)';
const API_RETRY_DELAY_MS = 2000;
const API_RATE_LIMIT_MS = 500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchApiRows(apiTable: string): Promise<Record<string, string>[]> {
  const url = `${API_BASE}?table=${encodeURIComponent(apiTable)}`;
  const headers = { 'User-Agent': API_UA };

  let res: Response;
  try {
    res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // retry único após 2s
    await sleep(API_RETRY_DELAY_MS);
    res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${apiTable}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  if (json.error) throw new Error(`API UESP: ${JSON.stringify(json.error)}`);
  const rows = json[apiTable];
  if (!Array.isArray(rows)) {
    throw new Error(`Campo '${apiTable}' ausente na resposta da API UESP`);
  }
  return rows as Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

export type SeedProgressKind = 'start' | 'rows' | 'done' | 'skip';

export interface SeedProgressEvent {
  table: string;
  kind: SeedProgressKind;
  rows?: number;
  detail?: string;
}

export interface BuildUespGameDataOptions {
  /** Diretório contendo os dumps UESP (`buildEditor*.sql.gz`, `cp*.sql.gz`). */
  dumpDir: string;
  /** Versão das regras; `null`/ausente = maior versão numérica disponível. */
  version?: string | null;
  /** Pula a busca via API UESP (skillsData sai vazio). */
  skipApi?: boolean;
  onProgress?: (event: SeedProgressEvent) => void;
}

export interface BuildUespGameDataResult {
  initData: UespInitData;
  version: string;
  counts: Record<string, number>;
}

function createTableSql(spec: TableSpec): string {
  const cols = spec.columns
    .map(([name, type]) => (name === 'id' ? `"${name}" ${type} PRIMARY KEY` : `"${name}" ${type}`))
    .join(', ');
  return `CREATE TABLE "${spec.tableName}" (${cols})`;
}

function insertSql(spec: TableSpec): string {
  const cols = spec.columns.map(([name]) => `"${name}"`).join(', ');
  const placeholders = spec.columns.map(() => '?').join(', ');
  return `INSERT INTO "${spec.tableName}" (${cols}) VALUES (${placeholders})`;
}

async function seedDumpTable(
  db: DatabaseSync,
  spec: DumpTableSpec,
  dumpFile: string,
  onProgress: (event: SeedProgressEvent) => void,
): Promise<number> {
  onProgress({ table: spec.tableName, kind: 'start', detail: path.basename(dumpFile) });
  const stmt = db.prepare(insertSql(spec));
  const expectedCols = spec.columns.length;
  let count = 0;

  db.exec('BEGIN');
  try {
    for await (const cols of iterateDumpRows(dumpFile, spec.tableName)) {
      assertCols(cols, expectedCols, spec.tableName);
      stmt.run(...cols);
      count++;
      if (count % BATCH_SIZE === 0) {
        onProgress({ table: spec.tableName, kind: 'rows', rows: count });
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  onProgress({ table: spec.tableName, kind: 'done', rows: count });
  return count;
}

async function seedApiTable(
  db: DatabaseSync,
  spec: ApiTableSpec,
  onProgress: (event: SeedProgressEvent) => void,
): Promise<number> {
  onProgress({ table: spec.tableName, kind: 'start', detail: `API: ${spec.apiTable}` });
  const rows = await fetchApiRows(spec.apiTable);
  const stmt = db.prepare(insertSql(spec));
  const numeric = new Set(spec.numericCols);

  db.exec('BEGIN');
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      stmt.run(
        ...spec.columns.map(([name]) => {
          const v = r[name];
          if (v == null || v === undefined) return null;
          return numeric.has(name) ? Number(v) : v;
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
  return rows.length;
}

function resolveMaxVersion(db: DatabaseSync): string {
  const row = db
    .prepare("SELECT MAX(CAST(version AS INTEGER)) as v FROM rules WHERE version GLOB '[0-9]*'")
    .get() as { v: number | null };
  return String(row.v);
}

/**
 * Executa o pipeline completo: dumps + API → `UespInitData`.
 * O banco SQLite é criado em memória e descartado ao final.
 */
export async function buildUespGameData(
  options: BuildUespGameDataOptions,
): Promise<BuildUespGameDataResult> {
  const { dumpDir, version = null, skipApi = false, onProgress = () => {} } = options;

  if (!fs.existsSync(dumpDir)) {
    throw new Error(`Diretório de dumps não encontrado: '${dumpDir}'`);
  }

  const dumpFiles: Record<DumpTableSpec['dumpPrefix'], string | null> = {
    buildEditor: findDumpFile(dumpDir, 'buildEditor'),
    cp: findDumpFile(dumpDir, 'cp'),
  };
  for (const [prefix, file] of Object.entries(dumpFiles)) {
    if (!file) {
      throw new Error(`Dump não encontrado: nenhum arquivo '${prefix}*.sql.gz' em '${dumpDir}'`);
    }
  }

  const db = new DatabaseSync(':memory:');
  try {
    for (const spec of [...DUMP_TABLES, ...API_TABLES]) {
      db.exec(createTableSql(spec));
    }
    // acelera o JOIN effects ⋈ rules em extractGameData
    db.exec('CREATE INDEX idx_effects_ruleId ON effects(ruleId)');

    const counts: Record<string, number> = {};
    for (const spec of DUMP_TABLES) {
      counts[spec.tableName] = await seedDumpTable(
        db,
        spec,
        dumpFiles[spec.dumpPrefix] as string,
        onProgress,
      );
    }

    if (skipApi) {
      for (const spec of API_TABLES) {
        onProgress({ table: spec.tableName, kind: 'skip' });
      }
    } else {
      for (const spec of API_TABLES) {
        counts[spec.tableName] = await seedApiTable(db, spec, onProgress);
        await sleep(API_RATE_LIMIT_MS);
      }
    }

    const resolvedVersion = version ?? resolveMaxVersion(db);
    const initData = extractGameData(db, resolvedVersion);
    return { initData, version: resolvedVersion, counts };
  } finally {
    db.close();
  }
}
