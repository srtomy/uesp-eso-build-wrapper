#!/usr/bin/env node
/**
 * Pós-processa a build ESM (dist/esm) gerada por `tsc -p tsconfig.build-esm.json`.
 *
 * 1. Cria um `package.json` aninhado `{"type":"module"}` em dist/esm — sem ele o
 *    Node interpreta os `.js` como CommonJS (o pacote raiz é `"type": "commonjs"`).
 * 2. Reescreve o global `__dirname` → `import.meta.dirname` nos `.js` emitidos.
 *    O source compartilha `__dirname` porque a build CJS precisa dele; no ESM o
 *    Node não expõe `__dirname`, só `import.meta.dirname` (Node >= 20.11).
 * 3. Sanidade: garante que a saída é ESM de verdade (sem `require()` e com o
 *    caminho do pacote resolvido via import.meta).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esmDir = path.join(repoRoot, 'dist/esm');

if (!fs.existsSync(esmDir)) {
  console.error('[postbuild-esm] dist/esm não existe — rode tsc -p tsconfig.build-esm.json primeiro');
  process.exit(1);
}

// 1. package.json aninhado → dist/esm/**/*.js e *.d.ts tratados como ESM.
fs.writeFileSync(path.join(esmDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');

// 2. __dirname → import.meta.dirname em todos os .js emitidos (dist/esm é 100% ESM).
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const rewritten = [];
for (const file of walk(esmDir)) {
  if (!file.endsWith('.js')) continue;
  const src = fs.readFileSync(file, 'utf-8');
  if (!src.includes('__dirname')) continue;
  fs.writeFileSync(file, src.replaceAll('__dirname', 'import.meta.dirname'));
  rewritten.push(path.relative(esmDir, file));
}

// 3. Sanidade: entrada ESM sem require() e com resolução de pacote por import.meta.
const esmEntry = path.join(esmDir, 'lib/eso-engine/index.js');
const entry = fs.readFileSync(esmEntry, 'utf-8');
if (/\brequire\s*\(/.test(entry)) {
  console.error('[postbuild-esm] saída ESM contém require() — a build não é ESM de verdade');
  process.exit(1);
}
if (!entry.includes('import.meta.dirname')) {
  console.error('[postbuild-esm] index.js não resolve o pacote via import.meta.dirname');
  process.exit(1);
}

if (rewritten.length > 0) {
  console.log(`[postbuild-esm] __dirname → import.meta.dirname em: ${rewritten.join(', ')}`);
}
console.log('[postbuild-esm] dist/esm marcado como ESM ({"type":"module"})');