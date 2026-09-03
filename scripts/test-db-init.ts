/**
 * Validates that the committed uesp-game-data.json is aligned with the live SQLite database.
 *
 * USAGE:
 *   npm run test:db-init [path-to-build.json] [path-to-db] [version]
 *
 * Defaults:
 *   build: ~/Downloads/uesp-build-export.json
 *   db:    ../eso-build-editor/local.db
 *   version: highest numeric version available in the database
 *
 * The script runs the same build TWICE — once with the committed JSON and once
 * reading the database directly — and compares the results. Mismatches indicate
 * that the JSON needs to be regenerated with: npm run generate-data -- --db <db>
 */

import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import type { BuildInput, ComputedStats, UespInitData } from '../src/lib/eso-engine/index.js';
import { calculateBuild, initEsoEngineFromData, resetEngine } from '../src/lib/eso-engine/index.js';
import { extractGameData } from '../src/lib/uesp-data/index.js';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const buildJsonPath =
  process.argv[2] ?? path.resolve(process.env.HOME!, 'Downloads/uesp-build-export.json');
const dbPath = process.argv[3] ?? path.resolve(import.meta.dirname, '../../eso-build-editor/local.db');
// Rules version to use. Change here to pin manually (e.g. '49', '50').
// null = highest numeric version available in the database.
const RULES_VERSION: string | null = null;
const versionOverride = process.argv[4] ?? RULES_VERSION;

if (!fs.existsSync(buildJsonPath)) {
  console.error(`Build JSON not found: ${buildJsonPath}`);
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const build: BuildInput & { expectedStats?: Record<string, number> } = JSON.parse(
  fs.readFileSync(buildJsonPath, 'utf-8'),
);

const INIT_JSON = path.resolve(import.meta.dirname, '../vendor/uesp-data/uesp-game-data.json');
const LINE = '─'.repeat(72);

// ---------------------------------------------------------------------------
// Run build + collect raw stats
// ---------------------------------------------------------------------------
function runBuild(label: string, initFn: () => void): Record<string, number> {
  resetEngine();
  initFn();
  const result: ComputedStats = calculateBuild(build as BuildInput);
  console.log(
    `\n[${label}]  Health=${result.Health}  Magicka=${result.Magicka}  SpellDamage=${result.SpellDamage}`,
  );
  return result.raw as Record<string, number>;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`\n${LINE}`);
console.log(`  BUILD: ${path.basename(buildJsonPath)}`);
console.log(`  DB:    ${dbPath}`);
console.log(LINE);

// Run #1 — committed JSON (baseline)
console.log('\nRunning with uesp-game-data.json (committed)...');
const t0 = Date.now();
const jsonInitData = JSON.parse(fs.readFileSync(INIT_JSON, 'utf-8')) as UespInitData;
const rawJson = runBuild('JSON', () => initEsoEngineFromData({ initData: jsonInitData }));
console.log(`  time: ${Date.now() - t0}ms`);

// Run #2 — DB
console.log('\nRunning with local.db (SQLite)...');
const db = new DatabaseSync(dbPath);
const t1 = Date.now();
const dbInitData = extractGameData(db, versionOverride);
const tLoad = Date.now();
console.log(`  database load: ${tLoad - t1}ms`);
const rawDb = runBuild('DB ', () => initEsoEngineFromData({ initData: dbInitData }));
console.log(`  total time (load + calc): ${Date.now() - t1}ms`);
db.close();

// ---------------------------------------------------------------------------
// Comparison: JSON vs DB
// ---------------------------------------------------------------------------
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function compare(
  label: string,
  a: Record<string, number>,
  b: Record<string, number>,
  labelA: string,
  labelB: string,
) {
  const allIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  const rows: { id: string; va: number; vb: number; match: boolean }[] = [];
  for (const id of allIds) {
    const va = a[id] ?? 0;
    const vb = b[id] ?? 0;
    rows.push({ id, va, vb, match: Math.abs(va - vb) <= 1 });
  }
  const mismatches = rows.filter((r) => !r.match);
  const matches = rows.filter((r) => r.match);

  console.log(`\n${LINE}`);
  console.log(
    `  ${BOLD}${label}${RESET}  (${matches.length} ok, ${mismatches.length} mismatches)`,
  );
  console.log(`  ${'STAT'.padEnd(42)} ${labelA.padStart(12)} ${labelB.padStart(12)}  OK?`);
  console.log('  ' + '·'.repeat(74));
  for (const r of [...mismatches, ...matches]) {
    const color = r.match ? GREEN : RED;
    const flag = r.match ? 'ok   ' : 'DIFF ';
    const diff = r.match ? '' : ` (${r.vb > r.va ? '+' : ''}${(r.vb - r.va).toFixed(0)})`;
    console.log(
      `  ${color}${r.id.padEnd(42)} ${String(r.va).padStart(12)} ${String(r.vb).padStart(12)}${diff.padEnd(10)}  ${flag}${RESET}`,
    );
  }
  console.log(LINE);
  return mismatches.length;
}

const diffJsonDb = compare('uesp-game-data.json vs DB', rawJson, rawDb, 'JSON', 'DB');

// ---------------------------------------------------------------------------
// Comparison with expectedStats (when present in the exported build)
// ---------------------------------------------------------------------------
const expected = build.expectedStats;
if (expected && Object.keys(expected).length > 0) {
  compare('UESP vs JSON', expected, rawJson, 'UESP', 'JSON');
  compare('UESP vs DB', expected, rawDb, 'UESP', 'DB');
}

console.log(
  `\n  ${diffJsonDb === 0 ? GREEN + '✓ uesp-game-data.json is aligned with the database' : RED + `✗ ${diffJsonDb} mismatches — regenerate the JSON with: npm run generate-data -- --db ${dbPath}`}${RESET}\n`,
);
process.exit(diffJsonDb === 0 ? 0 : 1);
