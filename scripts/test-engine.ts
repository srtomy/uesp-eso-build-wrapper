/**
 * Script de teste do motor ESO — rode sem precisar subir nenhum servidor.
 *
 * USO:
 *   npm test
 *
 * PRÉ-REQUISITO:
 *   vendor/uesp-data/uesp-init-data.json deve existir (já incluso no projeto).
 */

import path from 'path';
import { initEsoEngine, calculateBuild } from '../src/lib/eso-engine';
import type { BuildInput, UespItemApiData } from '../src/lib/eso-engine';

// ---------------------------------------------------------------------------
// Inicializa o motor (uma vez por processo)
// ---------------------------------------------------------------------------
initEsoEngine(
  path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
  path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
);

// ---------------------------------------------------------------------------
// Exemplo: item real buscado da API da UESP
// GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=70&level=1&quality=1
// (Cured Kwama Leggings — apenas para demonstrar o mapeamento de campos)
// ---------------------------------------------------------------------------
const exampleLegItem: UespItemApiData = {
  itemId: '70',
  name: 'Cured Kwama Leggings',
  armorRating: '1234', // use o valor real do nível max (160CP quality 5)
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
// TEST 1: Personagem sem itens (baseline puro por raça/classe/nível)
// ---------------------------------------------------------------------------
console.log('\n=== TEST 1: High Elf Sorcerer nv50, 64 pts Magicka, sem itens ===');

const result1 = calculateBuild({
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
  },
});

// Valores esperados (fórmulas reais UESP v49):
// Health  = (300*50 + 1000) * 1 = 16000 (sem pontos em health)
// Magicka = (220*50 + 1000 + 111*64) * 1 = 19104
// Stamina = (220*50 + 1000) * 1 = 12000
// MagickaRegen = round(9.30612*50 + 48.7) = 514
console.log('Health:      ', result1.Health, ' (esperado: 16000)');
console.log('Magicka:     ', result1.Magicka, ' (esperado: 19104)');
console.log('Stamina:     ', result1.Stamina, ' (esperado: 12000)');
console.log('SpellDamage: ', result1.SpellDamage);
console.log('SpellCrit:   ', result1.SpellCrit);
console.log('MagickaRegen:', result1.MagickaRegen, ' (esperado: 514)');
console.log('EffectivePower:', result1.EffectivePower);

// ---------------------------------------------------------------------------
// TEST 2: Mesmo personagem COM item equipado — valida que g_EsoBuildItemData
//         foi populado corretamente e o motor processou o item
// ---------------------------------------------------------------------------
console.log('\n=== TEST 2: Mesmo personagem COM calça equipada ===');

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
console.log('Stamina:    ', result2.Stamina, ' (esperado > 12000 pelo enchant de stamina)');
console.log('SpellDamage:', result2.SpellDamage);

// TEST 3: Nord Tank nv50 com heavy armor (armorType=3)
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
console.log('Health:      ', result3.Health, ' (esperado: 23808)');
console.log('Magicka:     ', result3.Magicka);
console.log('Stamina:     ', result3.Stamina);
console.log('PhysicalResist:    ', result3.PhysicalResist);
console.log('DefensePhysicalMitigation:', result3.DefensePhysicalMitigation);

console.log('\n✓ Todos os testes executados. Verifique os valores acima.');
console.log('  Stats brutos disponíveis em result1.raw, result2.raw, result3.raw');
console.log('  Exemplo: result1.raw =', JSON.stringify(Object.keys(result1.raw).slice(0, 10)));
