/**
 * Manual exploration script for the ESO engine — run without needing to start any server.
 *
 * USAGE:
 *   npm run test:explore
 */

import fs from 'fs';
import path from 'path';
import { initEsoEngineFromData, calculateBuild } from '../src/lib/eso-engine/index.js';
import type { BuildInput, UespInitData, UespItemApiData } from '../src/lib/eso-engine/index.js';

// ---------------------------------------------------------------------------
// Initialize the engine (once per process)
// ---------------------------------------------------------------------------
const gameData = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, '../vendor/uesp-data/uesp-game-data.json'), 'utf-8'),
) as UespInitData;
initEsoEngineFromData({ initData: gameData });

// ---------------------------------------------------------------------------
// Example: real item fetched from the UESP API
// GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=70&level=1&quality=1
// (Cured Kwama Leggings — only to demonstrate the field mapping)
// ---------------------------------------------------------------------------
const exampleLegItem: UespItemApiData = {
  itemId: '70',
  name: 'Cured Kwama Leggings',
  armorRating: '1234', // use the real max-level value (160CP quality 5)
  weaponPower: '0',
  armorType: '2', // 2 = Medium
  weaponType: '0',
  traitDesc: 'Increases Critical Resistance by 47 and this item takes 50% less durability damage.',
  enchantName: 'Maximum Stamina Enchantment',
  enchantDesc: 'Adds 966 Maximum Stamina.',
  internalLevel: '1',
  internalSubtype: '0',
  setId: '49',
  setName: 'Shadow of the Red Mountain',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
  setBonusCount2: '3',
  setBonusDesc2: '(3 items) Adds 1096 Maximum Stamina',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 657 Critical Chance',
  setBonusCount4: '5',
  setBonusDesc4: '(5 items) When you deal damage with a weapon...',
  link: '|H0:item:70:0:1:0:...|h|h',
};

// ---------------------------------------------------------------------------
// TEST 1: Character without items (pure baseline by race/class/level)
// ---------------------------------------------------------------------------
console.log('\n=== TEST 1: High Elf Sorcerer lv50, 64 pts Magicka, no items ===');

const result1 = calculateBuild({
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
  },
});

// Expected values (real UESP v49 formulas):
// Health  = (300*50 + 1000) * 1 = 16000 (no points in health)
// Magicka = (220*50 + 1000 + 111*64) * 1 = 19104
// Stamina = (220*50 + 1000) * 1 = 12000
// MagickaRegen = round(9.30612*50 + 48.7) = 514
console.log('Health:      ', result1.Health, ' (expected: 16000)');
console.log('Magicka:     ', result1.Magicka, ' (expected: 19104)');
console.log('Stamina:     ', result1.Stamina, ' (expected: 12000)');
console.log('SpellDamage: ', result1.SpellDamage);
console.log('SpellCrit:   ', result1.SpellCrit);
console.log('MagickaRegen:', result1.MagickaRegen, ' (expected: 514)');
console.log('EffectivePower:', result1.EffectivePower);

// ---------------------------------------------------------------------------
// TEST 2: Same character WITH an equipped item — validates that g_EsoBuildItemData
//         was populated correctly and the engine processed the item
// ---------------------------------------------------------------------------
console.log('\n=== TEST 2: Same character WITH legs equipped ===');

const result2 = calculateBuild({
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
  },
  items: {
    Legs: exampleLegItem,
  },
});

console.log('Health:     ', result2.Health);
console.log('Magicka:    ', result2.Magicka);
console.log('Stamina:    ', result2.Stamina, ' (expected > 12000 from the stamina enchant)');
console.log('SpellDamage:', result2.SpellDamage);

// TEST 3: Nord Tank lv50 with heavy armor (armorType=3)
console.log('\n=== TEST 3: Nord Dragonknight Tank, 64 pts Health, heavy chest ===');

const heavyChest: UespItemApiData = {
  itemId: '999',
  armorRating: '2460',
  weaponPower: '0',
  armorType: '3', // 3 = Heavy
  weaponType: '0',
  traitDesc: '',
  enchantDesc: 'Adds 1487 Maximum Health.',
  internalLevel: '1',
  internalSubtype: '0',
};

const result3 = calculateBuild({
  character: {
    race: 'Nord',
    class: 'Dragonknight',
    level: 50,
    attributes: { health: 64, magicka: 0, stamina: 0 },
  },
  items: {
    Chest: heavyChest,
  },
});

// Health = (300*50 + 1000 + 122*64) * 1 = 16000 + 7808 = 23808
console.log('Health:      ', result3.Health, ' (expected: 23808)');
console.log('Magicka:     ', result3.Magicka);
console.log('Stamina:     ', result3.Stamina);
console.log('PhysicalResist:    ', result3.PhysicalResist);
console.log('DefensePhysicalMitigation:', result3.DefensePhysicalMitigation);

console.log('\n✓ All tests executed. Check the values above.');
console.log('  Raw stats available in result1.raw, result2.raw, result3.raw');
console.log('  Example: result1.raw =', JSON.stringify(Object.keys(result1.raw).slice(0, 10)));
