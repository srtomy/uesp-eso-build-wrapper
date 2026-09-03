/**
 * Generates vendor/uesp-data/uesp-game-data.json from a UESP SQLite database.
 *
 * Usage:
 *   npm run generate-data -- --db /path/to/local.db [--version 49]
 *
 * The generated file is committed to the repo and published in the npm package as
 * pre-extracted game data. Users pass the object to initEsoEngineFromData:
 *
 *   import data from 'uesp-eso-build-wrapper/uesp-game-data.json';
 *   initEsoEngineFromData({ initData: data });
 */

import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { extractGameData } from '../src/lib/uesp-data/index.js';

const ansi = (code: number) => (s: string) => `\x1b[${code}m${s}\x1b[0m`;
const c = {
  bold:   ansi(1),
  dim:    ansi(2),
  red:    ansi(31),
  green:  ansi(32),
  yellow: ansi(33),
  blue:   ansi(34),
  cyan:   ansi(36),
};
const ok   = c.green('✓');
const info = c.cyan('•');
const warn = c.yellow('⚠');

const makeLog = (prefix: string) =>
  (template: string, ...args: unknown[]) => console.log(`${prefix} ${template}`, ...args);

const log = {
  info: makeLog(info),
  ok:   makeLog(ok),
  warn: makeLog(warn),
  err:  (template: string, ...args: unknown[]) => console.error(`${c.red('✗')} ${template}`, ...args),
};

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.findIndex((a) => a === `--${name}`);
  return idx !== -1 ? args[idx + 1] : args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

const dbPath = getArg('db');
const versionArg = getArg('version') ?? null;

if (!dbPath) {
  log.err('Usage: npm run generate-data -- --db /path/to/local.db [--version 49]');
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  log.err('Database not found: %s', c.bold(dbPath));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const OUT_PATH = path.resolve(import.meta.dirname, '../vendor/uesp-data/uesp-game-data.json');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log();
log.info('Database: %s', c.bold(dbPath));

const db = new DatabaseSync(dbPath);

const version: string =
  versionArg ??
  (() => {
    const row = db
      .prepare("SELECT MAX(CAST(version AS INTEGER)) as v FROM rules WHERE version GLOB '[0-9]*'")
      .get() as any;
    return String(row.v);
  })();

log.info('Rules version: %s', c.cyan(c.bold(version)));

const t0 = Date.now();
const initData = extractGameData(db, version);
db.close();

const elapsed = Date.now() - t0;
const csCount = Object.keys(initData.computedStats).length;
const rulesTypes = Object.keys(initData.buildRules ?? {});
const rulesCount = Object.values(initData.buildRules ?? {}).reduce<number>(
  (acc, bucket) => acc + Object.keys(bucket as Record<string, unknown>).length,
  0
);
const cpCount = Object.keys(initData.cpSkillsData ?? {}).length;
const skillCount = Object.keys(initData.skillsData ?? {}).length;

console.log();
log.ok('Data loaded in %s', c.dim(elapsed + 'ms'));
console.log('   %s  %d', c.blue('computedStats'), csCount);
console.log('   %s  %d %s', c.blue('buildRules   '), rulesCount, c.dim('(' + rulesTypes.length + ' types)'));
console.log('   %s  %d', c.blue('cpSkillsData '), cpCount);
console.log('   %s  %d', c.blue('skillsData   '), skillCount);

const output = {
  _meta: {
    generatedAt: new Date().toISOString(),
    gameVersion: version,
    generator: 'uesp-eso-build-wrapper',
  },
  ...initData,
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output));

const sizeKb = Math.round(fs.statSync(OUT_PATH).size / 1024);
console.log();
log.ok('%s', c.green(c.bold(OUT_PATH)));
console.log('   Size: %s', c.dim(sizeKb + ' KB'));
console.log();
log.warn('Next step: %s', c.bold('git add vendor/uesp-data/uesp-game-data.json'));
console.log();
