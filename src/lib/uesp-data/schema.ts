/**
 * Shared SQLite schema for the `uesp-data` pipeline.
 *
 * The wrapper always materialises the game data in an in-memory SQLite database
 * (8 dump tables + 2 API tables) before running `extractGameData` — regardless of
 * where the rows came from (MariaDB dumps or HTTP). Keeping the table specs here
 * guarantees both sources produce the same `UespInitData` for the same game
 * version (modulo the `_meta` block and SQLite type affinity).
 *
 * Column order is positional for the dumps (`INSERT` column lists are generated
 * from these specs), so never reorder a table's columns.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SqlType = 'INTEGER' | 'TEXT' | 'REAL';
export type ColumnSpec = readonly [name: string, type: SqlType];

export interface TableSpec {
  tableName: string;
  columns: readonly ColumnSpec[];
}

export interface DumpTableSpec extends TableSpec {
  dumpPrefix: 'buildEditor' | 'cp';
}

export interface ApiTableSpec extends TableSpec {
  apiTable: string;
  /** Numeric API columns (mirror the reference seed's `Number()`). */
  numericCols: readonly string[];
}

/** Progress events shared by the dump (`db:seed`) and HTTP (`fetch-http`) sources. */
export type SeedProgressKind = 'start' | 'rows' | 'done' | 'skip';

export interface SeedProgressEvent {
  table: string;
  kind: SeedProgressKind;
  rows?: number;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Table specs
// ---------------------------------------------------------------------------

export const DUMP_TABLES: readonly DumpTableSpec[] = [
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
  {
    tableName: 'cp2Disciplines',
    dumpPrefix: 'cp',
    columns: [
      ['id', 'INTEGER'],
      ['disciplineIndex', 'INTEGER'],
      ['disciplineId', 'INTEGER'],
      ['name', 'TEXT'],
      ['discType', 'INTEGER'],
      ['numSkills', 'INTEGER'],
      ['bgTexture', 'TEXT'],
      ['glowTexture', 'TEXT'],
      ['selectTexture', 'TEXT'],
    ],
  },
  {
    tableName: 'cp2SkillLinks',
    dumpPrefix: 'cp',
    columns: [
      ['id', 'INTEGER'],
      ['parentSkillId', 'INTEGER'],
      ['skillId', 'INTEGER'],
    ],
  },
  {
    tableName: 'cp2ClusterRoots',
    dumpPrefix: 'cp',
    columns: [
      ['id', 'INTEGER'],
      ['skillId', 'INTEGER'],
      ['texture', 'TEXT'],
      ['name', 'TEXT'],
      ['skills', 'TEXT'],
      ['disciplineIndex', 'INTEGER'],
      ['disciplineId', 'INTEGER'],
    ],
  },
];

export const PLAYER_SKILLS_TEXT_COLUMNS = [
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

export const API_TABLES: readonly ApiTableSpec[] = [
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
// SQL helpers
// ---------------------------------------------------------------------------

export function createTableSql(spec: TableSpec): string {
  const cols = spec.columns
    .map(([name, type]) => (name === 'id' ? `"${name}" ${type} PRIMARY KEY` : `"${name}" ${type}`))
    .join(', ');
  return `CREATE TABLE "${spec.tableName}" (${cols})`;
}

export function insertSql(spec: TableSpec): string {
  const cols = spec.columns.map(([name]) => `"${name}"`).join(', ');
  const placeholders = spec.columns.map(() => '?').join(', ');
  return `INSERT INTO "${spec.tableName}" (${cols}) VALUES (${placeholders})`;
}

/** SQLite requires `1`/`0` instead of booleans when binding parameters. */
export function toSqlValue(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
}
