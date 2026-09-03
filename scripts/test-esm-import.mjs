#!/usr/bin/env node
/**
 * Smoke test do pacote ESM-only: empacota o tarball, instala num projeto limpo
 * e importa 'uesp-eso-build-wrapper' via `import` (ESM) e via `require` a partir
 * de CJS (require(esm), estável no Node >= 22.12 — o engines do pacote é >= 24),
 * inicializando o motor com o game data do repo e calculando um build.
 *
 * É o teste real de resolução do pacote:
 *   - exports["."] → dist/lib/eso-engine/index.{js,d.ts} (ESM, via import.meta.dirname)
 *   - os scripts vendor (esoEditBuild.js, esobuilddata.js, esoskills.js) vêm do
 *     pacote instalado — se a resolução de caminho do pacote falhar, a init lança.
 *
 * USO: npm run test:esm   (roda npm run build antes)
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameData = path.join(repoRoot, 'vendor/uesp-data/uesp-game-data.json');

if (!fs.existsSync(path.join(repoRoot, 'dist/lib/eso-engine/index.js'))) {
  console.error('[test-esm] build faltando: dist/lib/eso-engine/index.js — rode npm run build primeiro');
  process.exit(1);
}
if (!fs.existsSync(gameData)) {
  console.error('[test-esm] vendor/uesp-data/uesp-game-data.json não encontrado');
  process.exit(1);
}

const smokeSrc = `
import * as m from 'uesp-eso-build-wrapper';
import * as fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(process.env.GAME_DATA, 'utf-8'));
m.initEsoEngineFromData({ initData: data });

const stats = m.calculateBuild({
  character: { race: 'High Elf', class: 'Sorcerer', level: 50, attributes: { health: 0, magicka: 64, stamina: 0 } },
});

const expected = { Health: 16000, Magicka: 19104, Stamina: 12000 };
for (const [k, v] of Object.entries(expected)) {
  if (stats[k] !== v) {
    console.error(\`[esm-smoke] \${k}: got \${stats[k]}, expected \${v}\`);
    process.exitCode = 1;
  }
}
if (m.default !== m.calculateBuild) {
  console.error('[esm-smoke] default export !== calculateBuild');
  process.exitCode = 1;
}
for (const fn of ['listAvailableBuffs', 'listRacialPassives', 'debugBuild']) {
  if (typeof m[fn] !== 'function') {
    console.error(\`[esm-smoke] export faltando: \${fn}\`);
    process.exitCode = 1;
  }
}
if (process.exitCode) process.exit();
console.log(\`[esm-smoke] ok — Health=\${stats.Health} Magicka=\${stats.Magicka} Stamina=\${stats.Stamina}\`);
`;

const cjsSmokeSrc = `
// require(esm): o pacote é ESM-only; no Node >= 22.12 o require() de ESM é estável
// (o engines do pacote é >= 24). m recebe o namespace do módulo.
const m = require('uesp-eso-build-wrapper');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync(process.env.GAME_DATA, 'utf-8'));
m.initEsoEngineFromData({ initData: data });

const stats = m.calculateBuild({
  character: { race: 'High Elf', class: 'Sorcerer', level: 50, attributes: { health: 0, magicka: 64, stamina: 0 } },
});

const expected = { Health: 16000, Magicka: 19104, Stamina: 12000 };
for (const [k, v] of Object.entries(expected)) {
  if (stats[k] !== v) {
    console.error(\`[cjs-smoke] \${k}: got \${stats[k]}, expected \${v}\`);
    process.exitCode = 1;
  }
}
if (m.default !== m.calculateBuild) {
  console.error('[cjs-smoke] default export !== calculateBuild');
  process.exitCode = 1;
}
if (process.exitCode) process.exit();
console.log(\`[cjs-smoke] ok — Health=\${stats.Health} Magicka=\${stats.Magicka} Stamina=\${stats.Stamina}\`);
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uesp-esm-'));
try {
  const tarballName = execFileSync('npm', ['pack', '--silent', '--pack-destination', tmp], {
    cwd: repoRoot,
    encoding: 'utf-8',
  }).trim();
  const tarball = path.join(tmp, tarballName);

  // Sem dependências de runtime → instalação offline.
  execFileSync('npm', ['install', '--no-audit', '--no-fund', tarball], { cwd: tmp, stdio: 'inherit' });

  const env = { ...process.env, GAME_DATA: gameData };

  fs.writeFileSync(path.join(tmp, 'smoke.mjs'), smokeSrc);
  execFileSync(process.execPath, [path.join(tmp, 'smoke.mjs')], { cwd: tmp, stdio: 'inherit', env });

  fs.writeFileSync(path.join(tmp, 'smoke.cjs'), cjsSmokeSrc);
  execFileSync(process.execPath, [path.join(tmp, 'smoke.cjs')], { cwd: tmp, stdio: 'inherit', env });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
