/**
 * Tests for passive and active skill calculation via passiveSkills / skillBars.
 *
 * Requires g_SkillsData + esoskills.js (vendor/uesp-esolog/resources/esoskills.js).
 *
 * Tested passive IDs (Heavy Armor and Light Armor skill lines):
 *   29825 — Resolve rank 1 (Heavy Armor): +114 PhysResist+SpellResist per heavy piece
 *   45531 — Resolve rank 2 (Heavy Armor): +229 PhysResist+SpellResist per heavy piece
 *   45533 — Resolve rank 3 (Heavy Armor): +343 PhysResist+SpellResist per heavy piece
 *   29663 — Spell Warding rank 1 (Light Armor): +363 SpellResist per light piece
 *   45559 — Spell Warding rank 2 (Light Armor): +726 SpellResist per light piece
 *   29665 — Evocation rank 1 (Light Armor): +2% MagickaRegen per light piece
 *   45557 — Evocation rank 2 (Light Armor): +4% MagickaRegen per light piece
 *
 * Light armor items: real UESP API data — Whorl of the Depths set, level 50.
 * Heavy armor items: real UESP API data — Telvanni Efficiency set, level 50.
 *   Source: esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=50&quality=5
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { UespItemApiData } from '../src/lib/eso-engine/types';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

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

/** Light armor — real armorRatings from the UESP API (Whorl of the Depths, level 50 quality 5) */
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

/** Medium armor — bare items (no set, no enchant) to isolate passive deltas */
const MEDIUM_BASE: Partial<UespItemApiData> = {
  ...BASE_ITEM,
  armorType: '2',
  enchantDesc: '',
} as Partial<UespItemApiData>;

const SEVEN_MEDIUM: Record<string, UespItemApiData> = {
  Head: { ...MEDIUM_BASE, itemId: '2001', equipType: '1', armorRating: '1221' } as UespItemApiData,
  Shoulders: {
    ...MEDIUM_BASE,
    itemId: '2002',
    equipType: '2',
    armorRating: '1221',
  } as UespItemApiData,
  Chest: { ...MEDIUM_BASE, itemId: '2003', equipType: '3', armorRating: '1396' } as UespItemApiData,
  Hands: { ...MEDIUM_BASE, itemId: '2004', equipType: '13', armorRating: '698' } as UespItemApiData,
  Legs: { ...MEDIUM_BASE, itemId: '2005', equipType: '9', armorRating: '1221' } as UespItemApiData,
  Waist: { ...MEDIUM_BASE, itemId: '2006', equipType: '8', armorRating: '523' } as UespItemApiData,
  Feet: { ...MEDIUM_BASE, itemId: '2007', equipType: '10', armorRating: '1221' } as UespItemApiData,
};

/**
 * Heavy armor — Telvanni Efficiency set, real UESP API data.
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
  initEsoEngineFromData({ initData: loadInitData() });
});

// ---------------------------------------------------------------------------
// Infraestrutura
// ---------------------------------------------------------------------------
describe('skill infrastructure', () => {
  it('esoskills.js is loaded — GetEsoSkillDescription is a function', () => {
    expect(typeof (global as any).GetEsoSkillDescription).toBe('function');
  });

  it('g_SkillsData has at least 1000 skills', () => {
    const sd = (global as any).g_SkillsData ?? {};
    expect(Object.keys(sd).length).toBeGreaterThanOrEqual(1000);
  });

  it('g_SkillsData[45533] is Heavy Armor Resolve rank 3', () => {
    const skill = (global as any).g_SkillsData?.[45533];
    expect(skill).toBeDefined();
    expect(skill.name).toBe('Resolve');
    expect(skill.skillLine).toBe('Heavy Armor');
    expect(String(skill.rank)).toBe('3');
    expect(skill.isPassive).toBeTruthy();
  });

  it('ESO_PASSIVEEFFECT_MATCHES has a rule for Physical+Spell Resist per heavy armor piece', () => {
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

  it('empty passiveSkills does not crash and returns the same stats as without the field', () => {
    const without = calculateBuild({ character: CHAR });
    const withEmpty = calculateBuild({ character: CHAR, passiveSkills: [] });
    expect(withEmpty.Magicka).toBe(without.Magicka);
    expect(withEmpty.PhysicalResist).toBe(without.PhysicalResist);
  });
});

// ---------------------------------------------------------------------------
// Light Armor — Spell Warding (SpellResist per piece) — real values
// ---------------------------------------------------------------------------
describe('Light Armor — Spell Warding (SpellResist per piece, real items)', () => {
  it('rank 1: 7 light pieces → delta +2541 SpellResist (363 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [29663],
    });
    expect(withPassive.SpellResist - base.SpellResist).toBe(363 * 7);
  });

  it('rank 2: 7 light pieces → delta +5082 SpellResist (726 × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    expect(withPassive.SpellResist - base.SpellResist).toBe(726 * 7);
  });

  it('rank 2: absolute SpellResist with 7 light pieces = base(7501) + passive(5082) = 12583', () => {
    // base: 7 light pieces w/ real armorRatings → 7501 SpellResist
    // + Spell Warding r2: 726 × 7 = 5082
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    expect(withPassive.SpellResist).toBe(12583);
  });

  it('does not affect PhysicalResist', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    expect(withPassive.PhysicalResist).toBe(base.PhysicalResist);
  });

  it('scales with piece count: 3 light → delta +2178 (726 × 3)', () => {
    const threeLight = { Chest: LIGHT.Chest, Legs: LIGHT.Legs, Hands: LIGHT.Hands };
    const base = calculateBuild({ character: CHAR, items: threeLight });
    const withPassive = calculateBuild({
      character: CHAR,
      items: threeLight,
      passiveSkills: [45559],
    });
    expect(withPassive.SpellResist - base.SpellResist).toBe(726 * 3);
  });

  it('no armor equipped → passive does not apply (factor = 0)', () => {
    const base = calculateBuild({ character: CHAR });
    const withPassive = calculateBuild({ character: CHAR, passiveSkills: [45559] });
    expect(withPassive.SpellResist).toBe(base.SpellResist);
  });
});

// ---------------------------------------------------------------------------
// Light Armor — Evocation (MagickaRegen % per piece) — real values
// ---------------------------------------------------------------------------
describe('Light Armor — Evocation (MagickaRegen % per piece, real items)', () => {
  it('rank 1: 7 light pieces → MagickaRegen rises ~14% (2% × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [29665],
    });
    expect(withPassive.MagickaRegen / base.MagickaRegen).toBeCloseTo(1.14, 1);
  });

  it('rank 2: 7 light pieces → MagickaRegen rises ~28% (4% × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45557],
    });
    expect(withPassive.MagickaRegen / base.MagickaRegen).toBeCloseTo(1.28, 1);
  });

  it('does not affect SpellDamage', () => {
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
// Heavy Armor — Resolve (PhysicalResist + SpellResist per piece)
// Note: estimated armorRatings — replace with real UESP API items.
// ---------------------------------------------------------------------------
describe('Heavy Armor — Resolve (PhysResist + SpellResist per piece)', () => {
  it.each([
    { rank: 1, skillId: 29825, perPiece: 114, delta: 114 * 7 },
    { rank: 2, skillId: 45531, perPiece: 229, delta: 229 * 7 },
    { rank: 3, skillId: 45533, perPiece: 343, delta: 343 * 7 },
  ])(
    'rank $rank: 7 heavy pieces → delta +$delta PhysResist and SpellResist ($perPiece × 7)',
    ({ skillId, delta }) => {
      const base = calculateBuild({ character: CHAR, items: SEVEN_HEAVY });
      const withPassive = calculateBuild({
        character: CHAR,
        items: SEVEN_HEAVY,
        passiveSkills: [skillId],
      });
      expect(withPassive.PhysicalResist - base.PhysicalResist).toBe(delta);
      expect(withPassive.SpellResist - base.SpellResist).toBe(delta);
    },
  );

  it('scales with piece count: 3 heavy → delta +1029 (343 × 3)', () => {
    const threeHeavy = { Head: HEAVY.Head, Chest: HEAVY.Chest, Legs: HEAVY.Legs };
    const base = calculateBuild({ character: CHAR, items: threeHeavy });
    const withPassive = calculateBuild({
      character: CHAR,
      items: threeHeavy,
      passiveSkills: [45533],
    });
    expect(withPassive.PhysicalResist - base.PhysicalResist).toBe(343 * 3);
  });

  it('no armor equipped → passive does not apply (factor = 0)', () => {
    const base = calculateBuild({ character: CHAR });
    const withPassive = calculateBuild({ character: CHAR, passiveSkills: [45533] });
    expect(withPassive.PhysicalResist).toBe(base.PhysicalResist);
    expect(withPassive.SpellResist).toBe(base.SpellResist);
  });
});

// ---------------------------------------------------------------------------
// Multiple simultaneous passives
// ---------------------------------------------------------------------------
describe('multiple simultaneous passives', () => {
  it('HA Resolve r3 + LA Spell Warding r2 with mixed items add up correctly', () => {
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
    // Resolve: 343 × 4 heavy = +1372 (PhysResist and SpellResist)
    // Spell Warding: 726 × 3 light = +2178 (SpellResist only)
    expect(withBoth.PhysicalResist - base.PhysicalResist).toBe(343 * 4);
    expect(withBoth.SpellResist - base.SpellResist).toBe(343 * 4 + 726 * 3);
  });

  it('passives of different ranks do not stack — only the given one is applied', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_HEAVY });
    const rank1 = calculateBuild({ character: CHAR, items: SEVEN_HEAVY, passiveSkills: [29825] });
    const rank3 = calculateBuild({ character: CHAR, items: SEVEN_HEAVY, passiveSkills: [45533] });
    expect(rank1.PhysicalResist - base.PhysicalResist).toBe(114 * 7);
    expect(rank3.PhysicalResist - base.PhysicalResist).toBe(343 * 7);
  });
});

// ---------------------------------------------------------------------------
// Medium Armor — Agility (SpellDamage + WeaponDamage % per piece)
//
// Passive IDs:
//   29686 — Agility rank 1: +1% Spell/Weapon Damage per Medium Armor piece
//   45572 — Agility rank 2: +2% Spell/Weapon Damage per Medium Armor piece
//
// These passives use the [\r\n ]{2,} regex in the rule; they depend on \n\n → "  "
// (two spaces) generated by ComputeEsoInputSkillValue. They serve as a regression
// for the monkey-patch removed from loader.ts (2026-06-06).
// ---------------------------------------------------------------------------
describe('Medium Armor — Agility (Spell/WeaponDamage % per piece)', () => {
  it('rank 1: 7 medium pieces → SpellDamage +70 and WeaponDamage +70 (1% × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_MEDIUM });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_MEDIUM,
      passiveSkills: [29686],
    });
    expect(withPassive.SpellDamage - base.SpellDamage).toBe(70);
    expect(withPassive.WeaponDamage - base.WeaponDamage).toBe(70);
  });

  it('rank 2: 7 medium pieces → SpellDamage +140 and WeaponDamage +140 (2% × 7)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_MEDIUM });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_MEDIUM,
      passiveSkills: [45572],
    });
    expect(withPassive.SpellDamage - base.SpellDamage).toBe(140);
    expect(withPassive.WeaponDamage - base.WeaponDamage).toBe(140);
  });

  it('scales with piece count: 3 medium → SpellDamage +60 (2% × 3)', () => {
    const threeItems = {
      Chest: SEVEN_MEDIUM.Chest,
      Legs: SEVEN_MEDIUM.Legs,
      Hands: SEVEN_MEDIUM.Hands,
    };
    const base = calculateBuild({ character: CHAR, items: threeItems });
    const withPassive = calculateBuild({
      character: CHAR,
      items: threeItems,
      passiveSkills: [45572],
    });
    expect(withPassive.SpellDamage - base.SpellDamage).toBe(60);
  });

  it('no armor equipped → passive does not apply (factor = 0)', () => {
    const base = calculateBuild({ character: CHAR });
    const withPassive = calculateBuild({ character: CHAR, passiveSkills: [45572] });
    expect(withPassive.SpellDamage).toBe(base.SpellDamage);
  });
});

// ---------------------------------------------------------------------------
// Medium Armor Bonuses (150181) — movement cost reduction
//
// Skill 150181 ("Medium Armor Bonuses") contains multiple effects in a
// multi-line description (separated by \n\n). Rules 38323 and 38720 use [\r\n ]{2,}
// to detect list-item endings — they depend on \n\n → "  " (two spaces)
// generated internally by ComputeEsoInputSkillValue.
//
// These tests are a direct regression for the monkey-patch removed on 2026-06-06
// (loader.ts: RemoveEsoDescriptionFormats collapsed \n\n → " " and broke {2,}).
// ---------------------------------------------------------------------------
describe('Medium Armor Bonuses — SneakCost and SprintCost (via raw)', () => {
  it('7 medium pieces → SneakCost drops from 133 to 87 (−5% × 7 pieces)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_MEDIUM });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_MEDIUM,
      passiveSkills: [150181],
    });
    expect(withPassive.raw.SneakCost).toBe(87);
    expect(withPassive.raw.SneakCost - base.raw.SneakCost).toBe(-46);
  });

  it('7 medium pieces → SprintCost drops from 500 to 460 (−1% × 7 pieces)', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_MEDIUM });
    const withPassive = calculateBuild({
      character: CHAR,
      items: SEVEN_MEDIUM,
      passiveSkills: [150181],
    });
    expect(withPassive.raw.SprintCost).toBe(460);
    expect(withPassive.raw.SprintCost - base.raw.SprintCost).toBe(-40);
  });

  it('no armor equipped → no reduction (ArmorMedium factor = 0)', () => {
    const base = calculateBuild({ character: CHAR });
    const withPassive = calculateBuild({ character: CHAR, passiveSkills: [150181] });
    expect(withPassive.raw.SneakCost).toBe(base.raw.SneakCost);
    expect(withPassive.raw.SprintCost).toBe(base.raw.SprintCost);
  });
});

// ---------------------------------------------------------------------------
// passiveSkills — no bleed-through between calls
// ---------------------------------------------------------------------------
describe('passiveSkills — no bleed-through between calls', () => {
  it('call without passiveSkills after a call with a passive keeps no effect', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    calculateBuild({ character: CHAR, items: SEVEN_LIGHT, passiveSkills: [45559] }); // Spell Warding r2
    const clean = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    expect(clean.SpellResist).toBe(base.SpellResist);
  });

  it('a different passive on the next call does not stack with the previous one', () => {
    const base = calculateBuild({ character: CHAR, items: SEVEN_LIGHT });
    calculateBuild({ character: CHAR, items: SEVEN_LIGHT, passiveSkills: [45559] }); // Spell Warding r2
    const onlyWarding = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45559],
    });
    const onlyEvocation = calculateBuild({
      character: CHAR,
      items: SEVEN_LIGHT,
      passiveSkills: [45557],
    }); // Evocation r2
    // Evocation SpellResist must equal the base (Evocation does not affect SpellResist)
    expect(onlyEvocation.SpellResist).toBe(base.SpellResist);
    // Warding must still apply correctly
    expect(onlyWarding.SpellResist - base.SpellResist).toBe(726 * 7);
  });
});

// ---------------------------------------------------------------------------
// g_EsoSkillActiveData — skill bars
// ---------------------------------------------------------------------------
describe('g_EsoSkillActiveData populated from skillBars', () => {
  it('skillBars without skills → g_EsoSkillActiveData empty after calculation', () => {
    calculateBuild({ character: CHAR });
    const activeData = (global as any).g_EsoSkillActiveData ?? {};
    expect(Object.keys(activeData)).toHaveLength(0);
  });

  it('skillBars with 2 skills → g_EsoSkillActiveData has 2 entries', () => {
    calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 28807 }, { skillId: 24322 }] },
    });
    const activeData = (global as any).g_EsoSkillActiveData ?? {};
    expect(Object.keys(activeData)).toHaveLength(2);
    expect(activeData[28807]).toBeDefined();
    expect(activeData[28807].abilityId).toBe(28807);
    expect(activeData[24322]).toBeDefined();
  });

  it('skillBars with both bars → entries for all skills', () => {
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
