/**
 * Calcula e imprime os stats de um build exportado do UESP Build Editor.
 *
 * USO:
 *   npm run test:build <caminho-do-build.json>
 *
 * Fluxo:
 *   1. Configure um build no UESP Build Editor
 *   2. Rode scripts/browser-export-build.js no DevTools Console → baixa o JSON
 *   3. Rode este script passando o caminho do JSON
 *   4. Compare os stats impressos com os que o site exibe
 */

import path from 'path';
import fs from 'fs';
import { initEsoEngine, calculateBuild } from '../src/lib/eso-engine';
import type { BuildInput, ComputedStats } from '../src/lib/eso-engine';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Uso: npm run test:build <caminho-do-build.json>');
  console.error('Ex:  npm run test:build tests/fixtures/meu-build.json');
  process.exit(1);
}

const resolved = path.resolve(jsonPath);
if (!fs.existsSync(resolved)) {
  console.error(`Arquivo não encontrado: ${resolved}`);
  process.exit(1);
}

const build: BuildInput = JSON.parse(fs.readFileSync(resolved, 'utf-8'));

initEsoEngine(
  path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
  path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
);

// ---------------------------------------------------------------------------
// Cabeçalho — info do build
// ---------------------------------------------------------------------------
const { race, class: cls, level, attributes, championPoints, mundusStone, vampireStage, werewolfStage } = build.character;
const LINE = '─'.repeat(64);

console.log(`\n${LINE}`);
console.log(`  ${race} ${cls} — Nível ${level}`);
console.log(`  Atrib: Health ${attributes.health} | Magicka ${attributes.magicka} | Stamina ${attributes.stamina}`);
if (mundusStone)     console.log(`  Mundus: ${mundusStone}`);
if (championPoints)  console.log(`  CP: ${championPoints}`);
if (vampireStage)    console.log(`  Vampiro: estágio ${vampireStage}`);
if (werewolfStage)   console.log(`  Lobisomem: estágio ${werewolfStage}`);

if (build.items && Object.keys(build.items).length > 0) {
  console.log(`  Itens equipados:`);
  for (const [slot, item] of Object.entries(build.items)) {
    const name = item.name ?? `itemId ${item.itemId}`;
    const set  = item.setName ? ` [${item.setName}]` : '';
    console.log(`    ${slot.padEnd(12)} ${name}${set}`);
  }
}

if (build.skillBars) {
  const b1 = build.skillBars.bar1?.length ?? 0;
  const b2 = build.skillBars.bar2?.length ?? 0;
  console.log(`  Barras: bar1 (${b1} skills) | bar2 (${b2} skills)`);
}
if (build.activeBuffs?.length)  console.log(`  Buffs: ${build.activeBuffs.join(', ')}`);
if (build.toggleSkills?.length) console.log(`  Toggles: ${build.toggleSkills.join(', ')}`);
if (build.championPointNodes && Object.keys(build.championPointNodes).length > 0)
  console.log(`  CP nodes: ${Object.keys(build.championPointNodes).length} alocados`);

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
const result: ComputedStats = calculateBuild(build);
const raw = result.raw as Record<string, number>;
const v = (id: string) => raw[id] ?? 0;

const section = (title: string) => {
  console.log(`\n  ${title}`);
  console.log('  ' + '·'.repeat(42));
};
const row = (label: string, val: number, unit = '') =>
  console.log(`    ${label.padEnd(36)} ${String(val).padStart(8)}${unit}`);
const pct = (label: string, val: number) =>
  console.log(`    ${label.padEnd(36)} ${(val * 100).toFixed(2).padStart(8)} %`);

// ---------------------------------------------------------------------------
// Atributos
// ---------------------------------------------------------------------------
console.log(`\n${LINE}`);
section('ATRIBUTOS & REGENERAÇÃO');
row('Health',              result.Health);
row('Magicka',             result.Magicka);
row('Stamina',             result.Stamina);
row('Health Regen',        result.HealthRegen);
row('Magicka Regen',       result.MagickaRegen);
row('Stamina Regen',       result.StaminaRegen);

// ---------------------------------------------------------------------------
// Ofensivo
// ---------------------------------------------------------------------------
section('OFENSIVO');
row('Spell Damage',            result.SpellDamage);
row('Weapon Damage',           result.WeaponDamage);
pct('Spell Crit',              result.SpellCrit);
pct('Weapon Crit',             result.WeaponCrit);
pct('Spell Crit Damage',       result.SpellCritDamage);
pct('Weapon Crit Damage',      result.WeaponCritDamage);
row('Spell Penetration',       result.SpellPenetration);
row('Physical Penetration',    result.PhysicalPenetration);
row('Effective Spell Power',   result.EffectiveSpellPower);
row('Effective Weapon Power',  result.EffectiveWeaponPower);
row('Effective Power',         result.EffectivePower);

// ---------------------------------------------------------------------------
// Defensivo
// ---------------------------------------------------------------------------
section('DEFENSIVO');
row('Physical Resist',              result.PhysicalResist);
row('Spell Resist',                 result.SpellResist);
row('Crit Resist',                  result.CritResist);
pct('Def Physical Mitigation',      result.DefensePhysicalMitigation);
pct('Def Spell Mitigation',         result.DefenseSpellMitigation);
pct('Atk Physical Mitigation',      result.AttackPhysicalMitigation);
pct('Atk Spell Mitigation',         result.AttackSpellMitigation);

// ---------------------------------------------------------------------------
// Cura & movimento
// ---------------------------------------------------------------------------
section('CURA & MOVIMENTO');
pct('Healing Done',    result.HealingDone);
pct('Healing Taken',   result.HealingTaken);
row('Run Speed',       result.RunSpeed,     ' m/s');
row('Sprint Speed',    result.SprintSpeed,  ' m/s');

// ---------------------------------------------------------------------------
// Todos os outros stats do raw que não apareceram acima
// ---------------------------------------------------------------------------
const SHOWN = new Set([
  'Health','Magicka','Stamina',
  'HealthRegen','MagickaRegen','StaminaRegen',
  'SpellDamage','WeaponDamage',
  'WeaponCrit','SpellCrit','SpellCritDamage','WeaponCritDamage',
  'SpellPenetration','PhysicalPenetration',
  'EffectiveSpellPower','EffectiveWeaponPower','EffectivePower',
  'PhysicalResist','SpellResist','CritResist',
  'DefensePhysicalMitigation','DefenseSpellMitigation',
  'AttackPhysicalMitigation','AttackSpellMitigation',
  'HealingDone','HealingTaken',
  'RunSpeed','SprintSpeed',
]);

const extras = Object.entries(raw)
  .filter(([k, val]) => !SHOWN.has(k) && val !== 0)
  .sort(([a], [b]) => a.localeCompare(b));

if (extras.length > 0) {
  section('OUTROS STATS (não-zero)');
  for (const [k, val] of extras) {
    row(k, val);
  }
}

console.log(`\n${LINE}\n`);

// ---------------------------------------------------------------------------
// Comparação com os valores reais do UESP (quando exportados junto ao build)
// ---------------------------------------------------------------------------
const expected = (build as any).expectedStats as Record<string, number> | undefined;
if (expected && Object.keys(expected).length > 0) {
  const RED   = '\x1b[31m';
  const GREEN = '\x1b[32m';
  const RESET = '\x1b[0m';
  const BOLD  = '\x1b[1m';

  const allIds = new Set([...Object.keys(expected), ...Object.keys(raw)]);
  const rows: { id: string; uesp: number; calc: number; match: boolean }[] = [];

  for (const id of allIds) {
    const uesp = expected[id] ?? 0;
    const calc = raw[id] ?? 0;
    // tolerância de 1 para arredondamento (floor vs round)
    const match = Math.abs(uesp - calc) <= 1;
    rows.push({ id, uesp, calc, match });
  }

  const mismatches = rows.filter(r => !r.match);
  const matches    = rows.filter(r => r.match);

  console.log(`${LINE}`);
  console.log(`  ${BOLD}COMPARAÇÃO COM UESP${RESET}  (${matches.length} ok, ${mismatches.length} divergências)`);
  console.log(`  ${'STAT'.padEnd(40)} ${'UESP'.padStart(10)} ${'CALCULADO'.padStart(10)}  MATCH`);
  console.log('  ' + '·'.repeat(68));

  // mostra divergências primeiro, depois os corretos
  for (const r of [...mismatches, ...matches]) {
    const color  = r.match ? GREEN : RED;
    const flag   = r.match ? 'true ' : 'false';
    const diff   = r.match ? '' : ` (${r.calc > r.uesp ? '+' : ''}${(r.calc - r.uesp).toFixed(0)})`;
    console.log(
      `  ${color}${r.id.padEnd(40)} ${String(r.uesp).padStart(10)} ${String(r.calc).padStart(10)}${diff.padEnd(10)}  ${flag}${RESET}`,
    );
  }
  console.log(`\n${LINE}\n`);
}
