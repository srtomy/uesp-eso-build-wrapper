/**
 * Wrapper data pipeline: MariaDB dumps + UESP API → `UespInitData`.
 *
 * Flow (one function, no persistent state):
 *   1. Locate the dumps (`buildEditor*.sql.gz`, `cp*.sql.gz`) in `dumpDir`
 *   2. Create an **in-memory** SQLite database with the engine's 10-table schema
 *      (8 dump tables + 2 API tables)
 *   3. Populate the 5 dump tables in streaming fashion (MariaDB parser)
 *   4. Populate `playerSkills` + `skillTree` via UESP API (retry + rate limit)
 *   5. Run `extractGameData` and return the `UespInitData`
 *
 * Engine-only scope: nothing here considers the eso-build-editor
 * helper tables (setSummary, minedItemSummary, skillTooltips, ...).
 */

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import type { UespInitData } from '../eso-engine/index.js';
import { assertCols, findDumpFile, iterateDumpRows } from './mariadb-dump.js';
import { extractGameData } from './extract.js';
import { fetchApiRows, sleep } from './api.js';
import { API_TABLES, DUMP_TABLES, createTableSql, insertSql } from './schema.js';
import type { ApiTableSpec, DumpTableSpec, SeedProgressEvent } from './schema.js';

// ---------------------------------------------------------------------------
// UESP API
// ---------------------------------------------------------------------------

/** Pause between API table fetches (be polite to UESP). */
const API_RATE_LIMIT_MS = 500;

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

export type { SeedProgressEvent, SeedProgressKind } from './schema.js';

export interface BuildUespGameDataOptions {
  /** Directory containing the UESP dumps (`buildEditor*.sql.gz`, `cp*.sql.gz`). */
  dumpDir: string;
  /** Rules version; `null`/absent = highest available numeric version. */
  version?: string | null;
  /** Skip the UESP API fetch (skillsData comes out empty). */
  skipApi?: boolean;
  onProgress?: (event: SeedProgressEvent) => void;
}

export interface BuildUespGameDataResult {
  initData: UespInitData;
  version: string;
  counts: Record<string, number>;
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
 * Runs the full pipeline: dumps + API → `UespInitData`.
 * The SQLite database is created in memory and discarded at the end.
 */
export async function buildUespGameData(
  options: BuildUespGameDataOptions,
): Promise<BuildUespGameDataResult> {
  const { dumpDir, version = null, skipApi = false, onProgress = () => {} } = options;

  if (!fs.existsSync(dumpDir)) {
    throw new Error(`Dump directory not found: '${dumpDir}'`);
  }

  const dumpFiles: Record<DumpTableSpec['dumpPrefix'], string | null> = {
    buildEditor: findDumpFile(dumpDir, 'buildEditor'),
    cp: findDumpFile(dumpDir, 'cp'),
  };
  for (const [prefix, file] of Object.entries(dumpFiles)) {
    if (!file) {
      throw new Error(`Dump not found: no '${prefix}*.sql.gz' file in '${dumpDir}'`);
    }
  }

  const db = new DatabaseSync(':memory:');
  try {
    for (const spec of [...DUMP_TABLES, ...API_TABLES]) {
      db.exec(createTableSql(spec));
    }
    // speeds up the effects ⋈ rules JOIN in extractGameData
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
