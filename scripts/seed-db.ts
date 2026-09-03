/**
 * Generates vendor/uesp-data/uesp-game-data.json directly from UESP MariaDB dumps
 * + esolog API — without needing eso-build-editor or a persisted database.
 *
 * Usage:
 *   npm run db:seed -- --dir /path/to/dumps [--version 50] [--skip-api] [--yes]
 *
 * Internal flow: `src/lib/uesp-data` parses the dumps in streaming fashion, fetches the
 * skill tables via API and runs the same `extractGameData` as
 * `generate-data` — the output JSON is a drop-in equivalent.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { buildUespGameData } from '../src/lib/uesp-data/index.js';

// ---------------------------------------------------------------------------
// ANSI / log (same style as generate-data.ts)
// ---------------------------------------------------------------------------

const ansi = (code: number) => (s: string) => `\x1b[${code}m${s}\x1b[0m`;
const c = {
  bold: ansi(1),
  dim: ansi(2),
  red: ansi(31),
  green: ansi(32),
  yellow: ansi(33),
  blue: ansi(34),
  cyan: ansi(36),
};
const ok = c.green('✓');
const info = c.cyan('•');
const warn = c.yellow('⚠');

const makeLog = (prefix: string) =>
  (template: string, ...args: unknown[]) => console.log(`${prefix} ${template}`, ...args);

const log = {
  info: makeLog(info),
  ok: makeLog(ok),
  warn: makeLog(warn),
  err: (template: string, ...args: unknown[]) => console.error(`${c.red('✗')} ${template}`, ...args),
};

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.findIndex((a) => a === `--${name}`);
  return idx !== -1 ? args[idx + 1] : args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

const hasFlag = (name: string) => args.includes(`--${name}`) || args.includes(`-${name[0]}`);

/**
 * Existence check via statSync in try/catch (not fs.existsSync) — the
 * existsSync + later-write pair is flagged by CodeQL as TOCTOU
 * (js/file-system-race).
 */
function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

const dirArg = getArg('dir');
const versionArg = getArg('version') ?? null;
const skipApi = hasFlag('skip-api');
const yesFlag = hasFlag('yes');

const OUT_PATH = path.resolve(getArg('out') ?? path.join(import.meta.dirname, '../vendor/uesp-data/uesp-game-data.json'));

if (!dirArg) {
  log.err('Usage: npm run db:seed -- --dir /path/to/dumps [--version 50] [--skip-api] [--yes]');
  process.exit(1);
}

const DUMP_DIR = path.resolve(dirArg.replace(/^~/, process.env.HOME ?? ''));

if (!fs.existsSync(DUMP_DIR)) {
  log.err('Dumps directory not found: %s', c.bold(DUMP_DIR));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Confirm (overwrites the committed JSON)
// ---------------------------------------------------------------------------

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(question, (a) => {
      rl.close();
      resolve(a);
    });
  });
  return answer.toLowerCase().startsWith('y');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log();
  log.info('Dumps: %s', c.bold(DUMP_DIR));
  log.info('Output: %s', c.bold(OUT_PATH));
  if (skipApi) log.warn('%s', c.yellow('--skip-api: skillsData will be empty'));

  if (fileExists(OUT_PATH) && !yesFlag) {
    const proceed = await confirm(
      `${c.yellow('?')} Overwrite ${c.bold(path.basename(OUT_PATH))}? [y/N]: `,
    );
    if (!proceed) {
      console.log(c.dim('Cancelled.'));
      process.exit(0);
    }
  }

  const t0 = Date.now();
  const { initData, version, counts } = await buildUespGameData({
    dumpDir: DUMP_DIR,
    version: versionArg,
    skipApi,
    onProgress: (event) => {
      switch (event.kind) {
        case 'start':
          console.log(`\n${c.bold(c.cyan('→'))} ${c.bold(event.table)} ${c.dim(`(${event.detail})`)}`);
          break;
        case 'rows':
          process.stdout.write(`\r  ${c.dim(`inserted ${event.rows} rows...`)}`);
          break;
        case 'done':
          process.stdout.write(`\r  ${ok} ${c.bold(String(event.rows))} rows${' '.repeat(12)}\n`);
          break;
        case 'skip':
          console.log(`\n${c.yellow('⚠')} ${c.bold(event.table)} ${c.dim('— skipped (--skip-api)')}`);
          break;
      }
    },
  });

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

  const elapsed = Date.now() - t0;
  const sizeKb = Math.round(fs.statSync(OUT_PATH).size / 1024);

  console.log();
  log.ok('Data generated in %s', c.dim(elapsed + 'ms'));
  console.log('   %s  %d', c.blue('computedStats'), Object.keys(initData.computedStats).length);
  const rulesTypes = Object.keys(initData.buildRules ?? {});
  const rulesCount = Object.values(initData.buildRules ?? {}).reduce<number>(
    (acc, bucket) => acc + Object.keys(bucket as Record<string, unknown>).length,
    0,
  );
  console.log(
    '   %s  %d %s',
    c.blue('buildRules   '),
    rulesCount,
    c.dim('(' + rulesTypes.length + ' types)'),
  );
  console.log('   %s  %d', c.blue('cpSkillsData '), Object.keys(initData.cpSkillsData ?? {}).length);
  console.log('   %s  %d', c.blue('skillsData   '), Object.keys(initData.skillsData ?? {}).length);
  console.log('   Rules version: %s', c.cyan(c.bold(version)));
  console.log('   Size: %s', c.dim(sizeKb + ' KB'));

  console.log();
  log.ok('%s', c.green(c.bold(OUT_PATH)));
  console.log();
  log.warn('Next step: %s', c.bold('git add vendor/uesp-data/uesp-game-data.json'));
  console.log();
}

main().catch((err) => {
  console.error(`\n${c.red('✗ db:seed failed:')}`, err);
  process.exit(1);
});
