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
import { initEsoEngineFromData, calculateBuild } from '../src/lib/eso-engine/index.js';
import type { BuildInput, ComputedStats, UespInitData } from '../src/lib/eso-engine/index.js';

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

const gameData = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, '../vendor/uesp-data/uesp-game-data.json'), 'utf-8'),
) as UespInitData;
initEsoEngineFromData({ initData: gameData });

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

if ((build as any).expectedStats) {
  console.log(`  Para validar contra o UESP: coloque o arquivo em tests/fixtures/ e rode npm test`);
  console.log(`\n${LINE}\n`);
}
