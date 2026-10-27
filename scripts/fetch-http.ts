/**
 * Generates `vendor/uesp-data/uesp-game-data.json` from UESP **HTTP endpoints** —
 * no MariaDB dumps, no local database.
 *
 * Usage:
 *   npm run fetch-http -- [--out <path>] [--page <saved.html>] [--save-rules <path>] [--skip-api] [--yes]
 *
 * Sources:
 *   - `rules` / `effects` / `computedStats` ← `g_EsoBuildRules` inline on
 *     https://en.uesp.net/wiki/Special:EsoBuildEditor (the live rules version)
 *   - `cp2*`, `playerSkills`, `skillTree`   ← https://esolog.uesp.net/exportJson.php
 *
 * The output is the same shape `db:seed` produces (same `extractGameData`).
 * Use it when the patch dumps are not available yet; see `docs/reference.md`
 * for the trade-offs (live-only, no historical pinning).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  EDITOR_PAGE_URL,
  buildUespGameDataFromHttp,
  fetchEditorPage,
  parseBuildRulesHtml,
} from '../src/lib/uesp-data/index.js';

// ---------------------------------------------------------------------------
// ANSI / log (same style as seed-db.ts / generate-data.ts)
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

const makeLog =
  (prefix: string) =>
  (template: string, ...args: unknown[]) =>
    console.log(`${prefix} ${template}`, ...args);

const log = {
  info: makeLog(info),
  ok: makeLog(ok),
  warn: makeLog(warn),
  err: (template: string, ...args: unknown[]) =>
    console.error(`${c.red('✗')} ${template}`, ...args),
};

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.findIndex((a) => a === `--${name}`);
  return idx !== -1 ? args[idx + 1] : args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

/** Long form only — `-s` would be ambiguous between `--skip-api` and `--save-rules`. */
const hasFlag = (name: string) => args.includes(`--${name}`);

/** statSync in try/catch (not existsSync) — avoids the CodeQL TOCTOU warning. */
function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

const OUT_PATH = path.resolve(
  getArg('out') ?? path.join(import.meta.dirname, '../vendor/uesp-data/uesp-game-data.json'),
);
const pageFile = getArg('page');
const saveRulesPath = getArg('save-rules');
const skipApi = hasFlag('skip-api');
const yesFlag = hasFlag('yes');

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
  log.info('Page: %s', c.bold(pageFile ? path.resolve(pageFile) : EDITOR_PAGE_URL));
  log.info('Output: %s', c.bold(OUT_PATH));
  if (skipApi) log.warn('%s', c.yellow('--skip-api: skillsData and cpSkillsData will be empty'));

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

  log.info('Fetching the build editor page...');
  const html = pageFile ? fs.readFileSync(pageFile, 'utf-8') : await fetchEditorPage();
  log.ok('Page loaded %s', c.dim(`(${Math.round((html.length / 1024 / 1024) * 10) / 10} MB)`));

  if (saveRulesPath) {
    const { payload, pageVersion } = parseBuildRulesHtml(html);
    fs.mkdirSync(path.dirname(path.resolve(saveRulesPath)), { recursive: true });
    fs.writeFileSync(path.resolve(saveRulesPath), JSON.stringify(payload));
    log.ok(
      'Raw rules snapshot %s %s',
      c.bold(saveRulesPath),
      c.dim(`(rules version ${pageVersion ?? '?'})`),
    );
  }

  const result = await buildUespGameDataFromHttp({
    html,
    skipApi,
    onProgress: (event) => {
      switch (event.kind) {
        case 'start':
          console.log(
            `\n${c.bold(c.cyan('→'))} ${c.bold(event.table)} ${c.dim(`(${event.detail})`)}`,
          );
          break;
        case 'rows':
          process.stdout.write(`\r  ${c.dim(`inserted ${event.rows} rows...`)}`);
          break;
        case 'done':
          process.stdout.write(`\r  ${ok} ${c.bold(String(event.rows))} rows${' '.repeat(12)}\n`);
          break;
        case 'skip':
          console.log(
            `\n${c.yellow('⚠')} ${c.bold(event.table)} ${c.dim('— skipped (--skip-api)')}`,
          );
          break;
      }
    },
  });

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      gameVersion: result.version,
      generator: 'uesp-eso-build-wrapper',
      source: 'http',
      skipApi,
      pageUrl: result.meta.pageUrl,
      fetchedAt: result.meta.fetchedAt,
      pageBytes: result.meta.pageBytes,
      rules: result.meta.rules,
      effects: result.meta.effects,
      stats: result.meta.stats,
    },
    ...result.initData,
  };

  // Atomic write — an interrupted run must never leave a truncated dataset behind.
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const tmpPath = `${OUT_PATH}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(output));
  fs.renameSync(tmpPath, OUT_PATH);

  const elapsed = Date.now() - t0;
  const sizeKb = Math.round(fs.statSync(OUT_PATH).size / 1024);

  console.log();
  log.ok('Data generated in %s', c.dim(elapsed + 'ms'));
  console.log(
    '   %s  %d',
    c.blue('computedStats'),
    Object.keys(result.initData.computedStats).length,
  );
  const rulesTypes = Object.keys(result.initData.buildRules ?? {});
  const rulesCount = Object.values(result.initData.buildRules ?? {}).reduce<number>(
    (acc, bucket) => acc + Object.keys(bucket as Record<string, unknown>).length,
    0,
  );
  console.log(
    '   %s  %d %s',
    c.blue('buildRules   '),
    rulesCount,
    c.dim('(' + rulesTypes.length + ' types)'),
  );
  console.log(
    '   %s  %d',
    c.blue('cpSkillsData '),
    Object.keys(result.initData.cpSkillsData ?? {}).length,
  );
  console.log(
    '   %s  %d',
    c.blue('skillsData   '),
    Object.keys(result.initData.skillsData ?? {}).length,
  );
  console.log('   Rules version: %s', c.cyan(c.bold(result.version)));
  console.log('   Size: %s', c.dim(sizeKb + ' KB'));

  console.log();
  log.ok('%s', c.green(c.bold(OUT_PATH)));
  console.log();
  log.warn('Next step: %s', c.bold('git add vendor/uesp-data/uesp-game-data.json'));
  console.log();
}

main().catch((err) => {
  console.error(`\n${c.red('✗ fetch-http failed:')}`, err);
  process.exit(1);
});
