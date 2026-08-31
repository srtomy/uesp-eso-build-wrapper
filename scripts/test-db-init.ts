/**
 * Valida que o uesp-game-data.json commitado está alinhado com o banco SQLite ao vivo.
 *
 * USO:
 *   npm run test:db-init [caminho-do-build.json] [caminho-do-db] [versão]
 *
 * Padrões:
 *   build: ~/Downloads/uesp-build-export.json
 *   db:    ../eso-build-editor/local.db
 *   versão: maior versão numérica disponível no banco
 *
 * O script roda o mesmo build DUAS vezes — uma com o JSON commitado e outra
 * com leitura direta do banco — e compara os resultados. Divergências indicam
 * que o JSON precisa ser regerado com: npm run generate-data -- --db <db>
 */

import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import type { BuildInput, ComputedStats, UespInitData } from '../src/lib/eso-engine';
import { calculateBuild, initEsoEngineFromData, resetEngine } from '../src/lib/eso-engine';
import { extractGameData } from '../src/lib/uesp-data';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const buildJsonPath =
  process.argv[2] ?? path.resolve(process.env.HOME!, 'Downloads/uesp-build-export.json');
const dbPath = process.argv[3] ?? path.resolve(__dirname, '../../eso-build-editor/local.db');
// Versão das regras a usar. Altere aqui para fixar manualmente (ex: '49', '50').
// null = maior versão numérica disponível no banco.
const RULES_VERSION: string | null = null;
const versionOverride = process.argv[4] ?? RULES_VERSION;

if (!fs.existsSync(buildJsonPath)) {
  console.error(`Build JSON não encontrado: ${buildJsonPath}`);
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error(`Banco de dados não encontrado: ${dbPath}`);
  process.exit(1);
}

const build: BuildInput & { expectedStats?: Record<string, number> } = JSON.parse(
  fs.readFileSync(buildJsonPath, 'utf-8'),
);

const INIT_JSON = path.resolve(__dirname, '../vendor/uesp-data/uesp-game-data.json');
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

// Run #1 — JSON commitado (baseline)
console.log('\nRodando com uesp-game-data.json (commitado)...');
const t0 = Date.now();
const jsonInitData = JSON.parse(fs.readFileSync(INIT_JSON, 'utf-8')) as UespInitData;
const rawJson = runBuild('JSON', () => initEsoEngineFromData({ initData: jsonInitData }));
console.log(`  tempo: ${Date.now() - t0}ms`);

// Run #2 — DB
console.log('\nRodando com local.db (SQLite)...');
const db = new DatabaseSync(dbPath);
const t1 = Date.now();
const dbInitData = extractGameData(db, versionOverride);
const tLoad = Date.now();
console.log(`  carregamento do banco: ${tLoad - t1}ms`);
const rawDb = runBuild('DB ', () => initEsoEngineFromData({ initData: dbInitData }));
console.log(`  tempo total (carga + cálculo): ${Date.now() - t1}ms`);
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
    `  ${BOLD}${label}${RESET}  (${matches.length} ok, ${mismatches.length} divergências)`,
  );
  console.log(`  ${'STAT'.padEnd(42)} ${labelA.padStart(12)} ${labelB.padStart(12)}  OK?`);
  console.log('  ' + '·'.repeat(74));
  for (const r of [...mismatches, ...matches]) {
    const color = r.match ? GREEN : RED;
    const flag = r.match ? 'ok   ' : 'DIFER';
    const diff = r.match ? '' : ` (${r.vb > r.va ? '+' : ''}${(r.vb - r.va).toFixed(0)})`;
    console.log(
      `  ${color}${r.id.padEnd(42)} ${String(r.va).padStart(12)} ${String(r.vb).padStart(12)}${diff.padEnd(10)}  ${flag}${RESET}`,
    );
  }
  console.log(LINE);
  return mismatches.length;
}

const diffJsonDb = compare('uesp-game-data.json vs Banco', rawJson, rawDb, 'JSON', 'Banco');

// ---------------------------------------------------------------------------
// Comparação com expectedStats (quando presentes no build exportado)
// ---------------------------------------------------------------------------
const expected = build.expectedStats;
if (expected && Object.keys(expected).length > 0) {
  compare('UESP vs JSON', expected, rawJson, 'UESP', 'JSON');
  compare('UESP vs Banco', expected, rawDb, 'UESP', 'Banco');
}

console.log(
  `\n  ${diffJsonDb === 0 ? GREEN + '✓ uesp-game-data.json está alinhado com o banco' : RED + `✗ ${diffJsonDb} divergências — regere o JSON com: npm run generate-data -- --db ${dbPath}`}${RESET}\n`,
);
process.exit(diffJsonDb === 0 ? 0 : 1);
