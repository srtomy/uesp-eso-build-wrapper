/**
 * Testes para cálculo de skill passivos e ativos via passiveSkills / skillBars.
 *
 * Requer g_SkillsData + esoskills.js (vendor/uesp-esolog/resources/esoskills.js).
 *
 * IDs dos passivos testados (Heavy Armor e Light Armor skill lines):
 *   29825 — Resolve rank 1 (Heavy Armor): +114 PhysResist+SpellResist por peça heavy
 *   45531 — Resolve rank 2 (Heavy Armor): +229 PhysResist+SpellResist por peça heavy
 *   45533 — Resolve rank 3 (Heavy Armor): +343 PhysResist+SpellResist por peça heavy
 *   29663 — Spell Warding rank 1 (Light Armor): +363 SpellResist por peça light
 *   45559 — Spell Warding rank 2 (Light Armor): +726 SpellResist por peça light
 *   29665 — Evocation rank 1 (Light Armor): +2% MagickaRegen por peça light
 *   45557 — Evocation rank 2 (Light Armor): +4% MagickaRegen por peça light
 *
 * Itens light armor: dados reais da API UESP — set Whorl of the Depths, level 50.
 * Itens heavy armor: dados reais da API UESP — set Telvanni Efficiency, level 50.
 *   Source: esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=50&quality=5
 */

import { beforeAll, describe, expect, it } from 'vitest';
import path from 'path';
import type { UespItemApiData } from '../src/lib/eso-engine/types';
import { calculateBuild, initEsoEngine } from '../src/lib/eso-engine';

const CHAR = {
  race: 'High Elf' as const,
  class: 'Sorcerer' as const,
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
};

// ---------------------------------------------------------------------------
// Fixtures: Light Armor — armorRatings reais (API UESP, Whorl of the Depths, level 50)
// ---------------------------------------------------------------------------

const BASE_ITEM: Partial<UespItemApiData> = {
  weaponPower: '0',
  weaponType: '0',
  type: '2',
  trait: '0',
  traitDesc: '',
  setBonusCount1: '-1',
  setBonusCount2: '-1',
  setBonusCount3: '-1',
  setBonusCount4: '-1',
  setBonusCount5: '-1',
  setBonusDesc1: '',
  setBonusDesc2: '',
  setBonusDesc3: '',
  setBonusDesc4: '',
  setBonusDesc5: '',
};

/** Light armor — armorRatings reais da API UESP (Whorl of the Depths, level 50 quality 5) */
const LIGHT: Record<string, UespItemApiData> = {
  Head: {
    ...BASE_ITEM,
    itemId: '186455',
    armorType: '1',
    equipType: '1',
    armorRating: '1221',
  } as UespItemApiData,
  Shoulders: {
    ...BASE_ITEM,
    itemId: '186456',
    armorType: '1',
    equipType: '2',
    armorRating: '1221',
  } as UespItemApiData,
  Chest: {
    ...BASE_ITEM,
    itemId: '186446',
    armorType: '1',
    equipType: '3',
    armorRating: '1396',
  } as UespItemApiData,
  Hands: {
    ...BASE_ITEM,
    itemId: '186448',
    armorType: '1',
    equipType: '13',
    armorRating: '698',
  } as UespItemApiData,
  Legs: {
    ...BASE_ITEM,
    itemId: '186450',
    armorType: '1',
    equipType: '9',
    armorRating: '1221',
  } as UespItemApiData,
  Waist: {
    ...BASE_ITEM,
    itemId: '186453',
    armorType: '1',
    equipType: '8',
    armorRating: '523',
  } as UespItemApiData,
  Feet: {
    ...BASE_ITEM,
    itemId: '186447',
    armorType: '1',
    equipType: '10',
    armorRating: '1221',
  } as UespItemApiData,
};

/**
 * Heavy armor — set Telvanni Efficiency, dados reais da API UESP.
 * Source: esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=50&quality=5
 * Trait 16 = Reinforced (Increase armor enchantment effect by 25%).
 */
const TELVANNI_SET = {
  type: '2',
  weaponType: '0',
  weaponPower: '0',
  armorType: '3',
  trait: '16',
  traitDesc: 'Increase armor enchantment effect by 25.',
  enchantDesc: '',
  setId: '696',
  setName: 'Telvanni Efficiency',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 803 Maximum Stamina',
  setBonusCount2: '3',
  setBonusDesc2: '(3 items) Adds 883 Maximum Health',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 803 Maximum Magicka',
  setBonusCount4: '5',
  setBonusDesc4:
    '(5 items) While you have a living Companion, reduce the cooldown of their abilities by 50%. While you do not have a living Companion, reduce the cost of your Magicka, Stamina, Health, and Ultimate abilities by 8%.',
  setBonusCount5: '-1',
  setBonusDesc5: '',
  internalLevel: '50',
  internalSubtype: '6',
};

const HEAVY: Record<string, UespItemApiData> = {
  Head: {
    ...TELVANNI_SET,
    itemId: '195013',
    equipType: '1',
    armorRating: '1781',
  } as UespItemApiData,
  Shoulders: {
    ...TELVANNI_SET,
    itemId: '195015',
    equipType: '4',
    armorRating: '1781',
  } as UespItemApiData,
  Chest: {
    ...TELVANNI_SET,
    itemId: '195010',
    equipType: '3',
    armorRating: '2036',
  } as UespItemApiData,
  Hands: {
    ...TELVANNI_SET,
    itemId: '195012',
    equipType: '13',
    armorRating: '1018',
  } as UespItemApiData,
  Legs: {
    ...TELVANNI_SET,
    itemId: '195014',
    equipType: '9',
    armorRating: '1781',
  } as UespItemApiData,
  Waist: {
    ...TELVANNI_SET,
    itemId: '195016',
    equipType: '8',
    armorRating: '763',
  } as UespItemApiData,
  Feet: {
    ...TELVANNI_SET,
    itemId: '195011',
    equipType: '10',
    armorRating: '1781',
  } as UespItemApiData,
};

const SEVEN_LIGHT = {
  Head: LIGHT.Head,
  Shoulders: LIGHT.Shoulders,
  Chest: LIGHT.Chest,
  Hands: LIGHT.Hands,
  Legs: LIGHT.Legs,
  Waist: LIGHT.Waist,
  Feet: LIGHT.Feet,
};
const SEVEN_HEAVY = {
  Head: HEAVY.Head,
  Shoulders: HEAVY.Shoulders,
  Chest: HEAVY.Chest,
  Hands: HEAVY.Hands,
  Legs: HEAVY.Legs,
  Waist: HEAVY.Waist,
  Feet: HEAVY.Feet,
};

beforeAll(() => {
  initEsoEngine(
    path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
    path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
  );
});

// ---------------------------------------------------------------------------
// Infraestrutura
// ---------------------------------------------------------------------------
describe('infraestrutura de skills', () => {
  it('esoskills.js está carregado — GetEsoSkillDescription é uma função', () => {
    expect(typeof (global as any).GetEsoSkillDescription).toBe('function');
  });

  it('g_SkillsData tem pelo menos 1000 skills', () => {
    const sd = (global as any).g_SkillsData ?? {};
    expect(Object.keys(sd).length).toBeGreaterThanOrEqual(1000);
  });

  it('g_SkillsData[45533] é Heavy Armor Resolve rank 3', () => {
    const skill = (global as any).g_SkillsData?.[45533];
    expect(skill).toBeDefined();
    expect(skill.name).toBe('Resolve');
    expect(skill.skillLine).toBe('Heavy Armor');
    expect(String(skill.rank)).toBe('3');
    expect(skill.isPassive).toBeTruthy();
  });

  it('ESO_PASSIVEEFFECT_MATCHES tem regra para Physical+Spell Resist por heavy armor', () => {
    const matches = (global as any).ESO_PASSIVEEFFECT_MATCHES as any[];
    const rule = matches?.find(
      (m: any) =>
        String(m.match).includes('Physical and Spell Resistance') &&
        String(m.match).includes('piece of Heavy Armor'),
    );
    expect(rule).toBeDefined();
    const effects = rule.effects as any[];
    expect(effects.some((e: any) => e.statId === 'PhysicalResist')).toBe(true);
    expect(effects.some((e: any) => e.statId === 'SpellResist')).toBe(true);
    expect(rule.factorStatId).toBe('ArmorHeavy');
  });

  it('passiveSkills vazio não crasha e retorna os mesmos stats que sem o campo', () => {
    const without = calculateBuild({ character: CHAR });
    const withEmpty = calculateBuild({ character: CHAR, passiveSkills: [] });
    expect(withEmpty.Magicka).toBe(without.Magicka);
    expect(withEmpty.PhysicalResist).toBe(without.PhysicalResist);
  });
});

// ---------------------------------------------------------------------------
// Light Armor — Spell Warding (SpellResist por peça) — valores reais
// ---------------------------------------------------------------------------
describe('Light Armor — Spell Warding (SpellResist por peça, itens reais)', () => {
  it('rank 1: 7 peças light → delta +2541 SpellResist (363 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [29663],
    });
    expect(withPassive.SpellResist - base.SpellResist).toBe(363 * 7);
  });

  it('rank 2: 7 peças light → delta +5082 SpellResist (726 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    expect(withPassive.SpellResist - base.SpellResist).toBe(726 * 7);
  });

  it('rank 2: SpellResist absoluto com 7 peças light = base(7501) + passive(5082) = 12583', () => {
    // base: 7 light pieces w/ real armorRatings → 7501 SpellResist
    // + Spell Warding r2: 726 × 7 = 5082
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    expect(withPassive.SpellResist).toBe(12583);
  });

  it('não afeta PhysicalResist', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    expect(withPassive.PhysicalResist).toBe(base.PhysicalResist);
  });

  it('escala com número de peças: 3 light → delta +2178 (726 × 3)', () => {
    const threeLight = { Chest: LIGHT.Chest, Legs: LIGHT.Legs, Hands: LIGHT.Hands };
    const base = calculateBuild({ character: CHAR, items: threeLight });
    const withPassive = calculateBuild({
      character: CHAR,
      items: threeLight,
      passiveSkills: [45559],
    });
    expect(withPassive.SpellResist - base.SpellResist).toBe(726 * 3);
  });

  it('sem armor equipado → passivo não aplica (fator = 0)', () => {
    const base = calculateBuild({ character: CHAR });
    const withPassive = calculateBuild({ character: CHAR, passiveSkills: [45559] });
    expect(withPassive.SpellResist).toBe(base.SpellResist);
  });
});

// ---------------------------------------------------------------------------
// Light Armor — Evocation (MagickaRegen % por peça) — valores reais
// ---------------------------------------------------------------------------
describe('Light Armor — Evocation (MagickaRegen % por peça, itens reais)', () => {
  it('rank 1: 7 peças light → MagickaRegen aumenta ~14% (2% × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [29665],
    });
    expect(withPassive.MagickaRegen / base.MagickaRegen).toBeCloseTo(1.14, 1);
  });

  it('rank 2: 7 peças light → MagickaRegen aumenta ~28% (4% × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45557],
    });
    expect(withPassive.MagickaRegen / base.MagickaRegen).toBeCloseTo(1.28, 1);
  });

  it('não afeta SpellDamage', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45557],
    });
    expect(withPassive.SpellDamage).toBe(base.SpellDamage);
  });
});

// ---------------------------------------------------------------------------
// Heavy Armor — Resolve (PhysicalResist + SpellResist por peça)
// Nota: armorRatings estimados — substituir por itens reais da API UESP.
// ---------------------------------------------------------------------------
describe('Heavy Armor — Resolve (PhysResist + SpellResist por peça)', () => {
  it('rank 1: 7 peças heavy → delta +798 PhysResist e SpellResist (114 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_HEAVY });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_HEAVY,
      passiveSkills: [29825],
    });
    expect(withPassive.PhysicalResist - base.PhysicalResist).toBe(114 * 7);
    expect(withPassive.SpellResist - base.SpellResist).toBe(114 * 7);
  });

  it('rank 2: 7 peças heavy → delta +1603 PhysResist e SpellResist (229 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_HEAVY });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_HEAVY,
      passiveSkills: [45531],
    });
    expect(withPassive.PhysicalResist - base.PhysicalResist).toBe(229 * 7);
    expect(withPassive.SpellResist - base.SpellResist).toBe(229 * 7);
  });

  it('rank 3: 7 peças heavy → delta +2401 PhysResist e SpellResist (343 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_HEAVY });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_HEAVY,
      passiveSkills: [45533],
    });
    expect(withPassive.PhysicalResist - base.PhysicalResist).toBe(343 * 7);
    expect(withPassive.SpellResist - base.SpellResist).toBe(343 * 7);
  });

  it('escala com número de peças: 3 heavy → delta +1029 (343 × 3)', () => {
    const threeHeavy = { Head: HEAVY.Head, Chest: HEAVY.Chest, Legs: HEAVY.Legs };
    const base = calculateBuild({ character: CHAR, items: threeHeavy });
    const withPassive = calculateBuild({
      character: CHAR,
      items: threeHeavy,
      passiveSkills: [45533],
    });
    expect(withPassive.PhysicalResist - base.PhysicalResist).toBe(343 * 3);
  });

  it('sem armor equipado → passivo não aplica (fator = 0)', () => {
    const base = calculateBuild({ character: CHAR });
    const withPassive = calculateBuild({ character: CHAR, passiveSkills: [45533] });
    expect(withPassive.PhysicalResist).toBe(base.PhysicalResist);
    expect(withPassive.SpellResist).toBe(base.SpellResist);
  });
});

// ---------------------------------------------------------------------------
// Múltiplos passivos simultâneos
// ---------------------------------------------------------------------------
describe('múltiplos passivos simultâneos', () => {
  it('HA Resolve r3 + LA Spell Warding r2 com itens mistos somam corretamente', () => {
    // 4 heavy + 3 light
    const mixedItems = {
      Head: HEAVY.Head,
      Chest: HEAVY.Chest,
      Legs: HEAVY.Legs,
      Waist: HEAVY.Waist,
      Shoulders: LIGHT.Shoulders,
      Hands: LIGHT.Hands,
      Feet: LIGHT.Feet,
    };
    const base = calculateBuild({ character: CHAR, items: mixedItems });
    const withBoth = calculateBuild({
      character: CHAR,
      items: mixedItems,
      passiveSkills: [45533, 45559], // Resolve r3 + Spell Warding r2
    });
    // Resolve: 343 × 4 heavy = +1372 (PhysResist e SpellResist)
    // Spell Warding: 726 × 3 light = +2178 (só SpellResist)
    expect(withBoth.PhysicalResist - base.PhysicalResist).toBe(343 * 4);
    expect(withBoth.SpellResist - base.SpellResist).toBe(343 * 4 + 726 * 3);
  });

  it('passivos de ranks diferentes não se acumulam — só o fornecido é aplicado', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_HEAVY });
    const rank1 = calculateBuild({ character: CHAR, items: SEVEN_HEAVY, passiveSkills: [29825] });
    const rank3 = calculateBuild({ character: CHAR, items: SEVEN_HEAVY, passiveSkills: [45533] });
    expect(rank1.PhysicalResist - base.PhysicalResist).toBe(114 * 7);
    expect(rank3.PhysicalResist - base.PhysicalResist).toBe(343 * 7);
  });
});

// ---------------------------------------------------------------------------
// g_EsoSkillActiveData — skill bars
// ---------------------------------------------------------------------------
describe('g_EsoSkillActiveData populado a partir de skillBars', () => {
  it('skillBars sem skills → g_EsoSkillActiveData vazio após o cálculo', () => {
    calculateBuild({ character: CHAR });
    const activeData = (global as any).g_EsoSkillActiveData ?? {};
    expect(Object.keys(activeData).length).toBe(0);
  });

  it('skillBars com 2 skills → g_EsoSkillActiveData tem 2 entradas', () => {
    calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 28807 }, { skillId: 24322 }] },
    });
    const activeData = (global as any).g_EsoSkillActiveData ?? {};
    expect(Object.keys(activeData).length).toBe(2);
    expect(activeData[28807]).toBeDefined();
    expect(activeData[28807].abilityId).toBe(28807);
    expect(activeData[24322]).toBeDefined();
  });

  it('skillBars com ambas as barras → entradas de todas as skills', () => {
    calculateBuild({
      character: CHAR,
      skillBars: {
        bar1: [{ skillId: 28807 }, { skillId: 24322 }],
        bar2: [{ skillId: 29073 }],
      },
    });
    const activeData = (global as any).g_EsoSkillActiveData ?? {};
    expect(activeData[28807]).toBeDefined();
    expect(activeData[24322]).toBeDefined();
    expect(activeData[29073]).toBeDefined();
  });
});
