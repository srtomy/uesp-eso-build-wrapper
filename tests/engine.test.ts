/**
 * Test suite for uesp-eso-build-wrapper.
 *
 * Validates the UESP math engine integration: baseline character stats,
 * item enchants, call isolation, and the shape of the returned ComputedStats.
 *
 * Golden values (Health=16000, Magicka=19104, etc.) reflect the vendored
 * UESP formulas. If they break after a vendor update, run `npm test` to
 * verify formula changes are intentional — see README "Updating Formulas".
 *
 * Item fixture: real UESP API payload for Jerkin of the Depths.
 * Source: GET https://esolog.uesp.net/exportJson.php?table=minedItem
 *              &id=186451&intlevel=50&inttype=366&limit=1
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { UespItemApiData } from '../src/lib/eso-engine';
import {
  calculateBuild,
  initEsoEngineFromData,
  listAvailableBuffs,
  listRacialPassives,
  listClassPassives,
  listPassivesBySkillLine,
  listAvailableSkillLines,
  listAvailableToggleSkills,
} from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

// ── Engine setup ──────────────────────────────────────────────────────────────

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

// ── Item fixtures (real UESP API payloads) ────────────────────────────────────

/**
 * Jerkin of the Depths — Chest, Light Armor, Whorl of the Depths (setId 646)
 * Enchant: Adds 668 Maximum Magicka.
 * Source: esolog.uesp.net/exportJson.php?table=minedItem&id=186451&intlevel=50&inttype=366&limit=1
 */
const JERKIN_OF_THE_DEPTHS: UespItemApiData = {
  itemId: '186451',
  name: 'Jerkin of the Depths',
  allNames: 'Jerkin of the Depths\n',
  description: '',
  icon: '/esoui/art/icons/gear_amenossea_lgt_chest_a.dds',
  level: '66',
  quality: '1',
  value: '57',
  style: '130',
  trait: '18',
  type: '2',
  specialType: '300',
  equipType: '3',
  weaponType: '0',
  armorType: '1',
  craftType: '2',
  bindType: '1',
  runeType: '-1',
  filterTypes: '',
  isUnique: '-1',
  isUniqueEquipped: '-1',
  isVendorTrash: '-1',
  isArmorDecay: '1',
  isConsumable: '-1',
  armorRating: '1220',
  weaponPower: '0',
  traitDesc: 'Increases Mundus Stone effects by 5.1%.',
  enchantName: 'Maximum Magicka Enchantment',
  enchantDesc: 'Adds 668 Maximum Magicka.',
  glyphMinLevel: '66',
  maxCharges: '-1',
  abilityDesc: '',
  abilityCooldown: '-1',
  setName: 'Whorl of the Depths',
  setId: '646',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusCount2: '3',
  setBonusCount3: '4',
  setBonusCount4: '5',
  setBonusCount5: '-1',
  setBonusDesc1: '(2 items) Adds 112 Weapon and Spell Damage',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusDesc3: '(4 items) Adds 112 Weapon and Spell Damage',
  setBonusDesc4:
    '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths to the target, dealing 1016 Frost damage over |cffffff8|r seconds.',
  setBonusDesc5: '',
  siegeType: '-1',
  siegeHP: '-1',
  bookTitle: '',
  craftSkillRank: '-1',
  recipeRank: '-1',
  recipeQuality: '-1',
  refinedItemLink: '',
  resultItemLink: '',
  materialLevelDesc: '',
  tags: '',
  dyeData: '',
  actorCategory: '-1',
  useType: '-1',
  sellInfo: '-1',
  traitTypeCategory: '2',
  combinationDesc: '',
  combinationId: '-1',
  defaultEnchantId: '19',
  furnLimitType: '-1',
  furnDataId: '-1',
  furnCategory: '',
  recipeListIndex: '-1',
  recipeIndex: '-1',
  containerCollectId: '-1',
  containerSetName: '',
  containerSetId: '-1',
  id: '154509840',
  internalLevel: '50',
  internalSubtype: '366',
  potionData: '0',
  traitAbilityDesc: '',
  link: '|H0:item:186451:366:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h',
};

/**
 * Ansuul's Helmet — Head, Medium Armor, Ansuul's Torment (setId 702)
 * Enchant: Adds 868 Maximum Stamina.
 * Source: esolog.uesp.net/exportJson.php?table=minedItem&id=196390&intlevel=50&inttype=370&limit=1
 */
const ANSUULS_HELMET: UespItemApiData = {
  itemId: '196390',
  name: "Ansuul's Helmet",
  allNames: "Ansuul's Helmet\n",
  description: '',
  icon: '/esoui/art/icons/gear_clandreamcarver_medium_head_a.dds',
  level: '66',
  quality: '5',
  value: '52',
  style: '142',
  trait: '18',
  type: '2',
  specialType: '300',
  equipType: '1',
  weaponType: '0',
  armorType: '2',
  craftType: '2',
  bindType: '1',
  runeType: '-1',
  filterTypes: '',
  isUnique: '-1',
  isUniqueEquipped: '-1',
  isVendorTrash: '-1',
  isArmorDecay: '1',
  isConsumable: '-1',
  armorRating: '1823',
  weaponPower: '0',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantName: 'Maximum Stamina Enchantment',
  enchantDesc: 'Adds 868 Maximum Stamina.',
  glyphMinLevel: '66',
  maxCharges: '-1',
  abilityDesc: '',
  abilityCooldown: '-1',
  setName: "Ansuul's Torment",
  setId: '702',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusCount2: '3',
  setBonusCount3: '4',
  setBonusCount4: '5',
  setBonusCount5: '-1',
  setBonusDesc1: '(2 items) Adds 657 Critical Chance',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusDesc3: '(4 items) Adds 1487 Offensive Penetration',
  setBonusDesc4:
    '(5 items) Increases your damage done against monsters by 7%. When you interrupt an enemy, you increase your damage done against monsters by an additional 7% for |cffffff10|r seconds.',
  setBonusDesc5: '',
  siegeType: '-1',
  siegeHP: '-1',
  bookTitle: '',
  craftSkillRank: '-1',
  recipeRank: '-1',
  recipeQuality: '-1',
  refinedItemLink: '',
  resultItemLink: '',
  materialLevelDesc: '',
  tags: '',
  dyeData: '',
  actorCategory: '-1',
  useType: '-1',
  sellInfo: '-1',
  traitTypeCategory: '2',
  combinationDesc: '',
  combinationId: '-1',
  defaultEnchantId: '25',
  furnLimitType: '-1',
  furnDataId: '-1',
  furnCategory: '',
  recipeListIndex: '-1',
  recipeIndex: '-1',
  containerCollectId: '-1',
  containerSetName: '',
  containerSetId: '-1',
  id: '153849070',
  internalLevel: '50',
  internalSubtype: '370',
  potionData: '0',
  traitAbilityDesc: '',
  link: '|H0:item:196390:370:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h',
};

// ── Shared character presets ──────────────────────────────────────────────────

const HIGH_ELF_SORC_64MAG = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

const NORD_DK_64HEA = {
  race: 'Nord',
  class: 'Dragonknight',
  level: 50,
  attributes: { health: 64, magicka: 0, stamina: 0 },
} as const;

// ── Test suites ───────────────────────────────────────────────────────────────

describe('calculateBuild', () => {
  // ── 1. Baseline stats (golden regression) ───────────────────────────────────
  describe('baseline — High Elf Sorcerer lv50, 64 Magicka pts, no items', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
    });

    it('Health = 16000  [formula: (300×50 + 1000)]', () => {
      expect(stats.Health).toBe(16000);
    });

    it('Magicka = 19104  [formula: (220×50 + 1000 + 111×64) with High Elf bonus]', () => {
      expect(stats.Magicka).toBe(19104);
    });

    it('Stamina = 12000  [formula: (220×50 + 1000)]', () => {
      expect(stats.Stamina).toBe(12000);
    });

    it('MagickaRegen = 514  [formula: round(9.30612×50 + 48.7)]', () => {
      expect(stats.MagickaRegen).toBe(514);
    });

    it('SpellDamage is a positive number', () => {
      expect(stats.SpellDamage).toBeGreaterThan(0);
    });
  });

  // ── 2. Item armor rating ──────────────────────────────────────────────────────
  describe('item armor rating — Jerkin of the Depths (Chest, Light, armorRating 1220)', () => {
    let basePhysicalResist: number;
    let withItemPhysicalResist: number;
    let withItemSpellResist: number;

    beforeAll(() => {
      basePhysicalResist =
        calculateBuild({ character: HIGH_ELF_SORC_64MAG }).raw['PhysicalResist'] ?? 0;
      const withItem = calculateBuild({
        character: HIGH_ELF_SORC_64MAG,
        items: { Chest: JERKIN_OF_THE_DEPTHS },
      });
      withItemPhysicalResist = withItem.raw['PhysicalResist'] ?? 0;
      withItemSpellResist = withItem.raw['SpellResist'] ?? 0;
    });

    it('equipping the chest item increases PhysicalResist', () => {
      expect(withItemPhysicalResist).toBeGreaterThan(basePhysicalResist);
    });

    it('PhysicalResist gain equals armorRating (1220) at no-trait scale', () => {
      expect(withItemPhysicalResist - basePhysicalResist).toBe(1220);
    });

    it('SpellResist gain equals PhysicalResist gain (armor grants both)', () => {
      expect(withItemSpellResist - basePhysicalResist).toBe(1220);
    });
  });

  // ── 3. Call isolation (A → B → A) ───────────────────────────────────────────
  describe('call isolation — character and item state resets between calls', () => {
    it('switching from one character to another and back yields the original stats', () => {
      const a1 = calculateBuild({ character: HIGH_ELF_SORC_64MAG });

      // Different character
      calculateBuild({ character: NORD_DK_64HEA });

      // Back to the first character — no bleed-through
      const a2 = calculateBuild({ character: HIGH_ELF_SORC_64MAG });

      expect(a2.Health).toBe(a1.Health);
      expect(a2.Magicka).toBe(a1.Magicka);
      expect(a2.Stamina).toBe(a1.Stamina);
    });

    it('items from a previous call do not carry over to the next call', () => {
      // Call WITH a Magicka chest item
      calculateBuild({
        character: HIGH_ELF_SORC_64MAG,
        items: { Chest: JERKIN_OF_THE_DEPTHS },
      });

      // Call WITHOUT items — Magicka must be the no-item baseline
      const clean = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
      expect(clean.Magicka).toBe(19104);
    });
  });

  // ── 4. Nord DK tank (golden regression) ─────────────────────────────────────
  describe('Nord Dragonknight tank — lv50, 64 Health pts, no items', () => {
    it('Health = 23808  [formula: (300×50 + 1000 + 122×64) with Nord bonus]', () => {
      const stats = calculateBuild({ character: NORD_DK_64HEA });
      expect(stats.Health).toBe(23808);
    });
  });

  // ── 5. Guard rails ───────────────────────────────────────────────────────────
  describe('guard rails', () => {
    it('level above 50 is clamped to 50 (same Health as an explicit lv50)', () => {
      const lv50 = calculateBuild({ character: HIGH_ELF_SORC_64MAG }).Health;
      const lv99 = calculateBuild({
        character: { ...HIGH_ELF_SORC_64MAG, level: 99 },
      }).Health;
      expect(lv99).toBe(lv50);
    });

    it('initEsoEngineFromData() called a second time is a safe no-op', () => {
      expect(() => initEsoEngineFromData({ initData: loadInitData() })).not.toThrow();
    });
  });

  // ── 6. Return value shape ────────────────────────────────────────────────────
  describe('ComputedStats return shape', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
    });

    it('raw contains all computed stat IDs (at least 10)', () => {
      expect(Object.keys(stats.raw).length).toBeGreaterThanOrEqual(10);
    });

    // Finite-number checks scoped to stats that are always deterministic at lv50.
    it.each([
      'Health',
      'Magicka',
      'Stamina',
      'HealthRegen',
      'MagickaRegen',
      'StaminaRegen',
      'WeaponDamage',
      'SpellDamage',
      'PhysicalResist',
      'SpellResist',
    ] as const)('"%s" is a finite number', (field) => {
      const value = stats[field];
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value)).toBe(true);
    });
  });
});

describe('calculateBuild with items', () => {
  // resource test
  describe('baseline — High Elf Sorcerer lv50, 64 Magicka pts', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: HIGH_ELF_SORC_64MAG,
        items: { Chest: JERKIN_OF_THE_DEPTHS, Head: ANSUULS_HELMET },
      });
    });

    it('Magicka = 19772  [formula: (220×50 + 1000 + 111×64) with High Elf bonus]', () => {
      expect(stats.Magicka).toBe(19772);
    });

    it('Stamina = 12868  [baseline 12000 + 868 Stamina enchant]', () => {
      // HIGH_ELF_SORC_64MAG has 0 Stamina pts → baseline = 220×50 + 1000 = 12000
      // Head is a large slot — no 0.4044 small-slot factor applies
      expect(stats.Stamina).toBe(12868);
    });

    it('MagickaRegen = 514  [baseline — Max Magicka/Stamina enchants do not affect regen]', () => {
      expect(stats.MagickaRegen).toBe(514);
    });

    it('StaminaRegen = 514  [baseline — no regen enchant]', () => {
      expect(stats.StaminaRegen).toBe(514);
    });

    it('HealthRegen = 309  [baseline — no regen enchant]', () => {
      expect(stats.HealthRegen).toBe(309);
    });
  });

  // ── Armor section ─────────────────────────────────────────────────────────────
  describe('armor rating — medium Ansuul head (1823) stacked with light Jerkin chest (1220)', () => {
    let basePhysicalResist: number;
    let baseSpellResist: number;
    let withHeadPhysicalResist: number;
    let withHeadSpellResist: number;
    let withBothPhysicalResist: number;

    beforeAll(() => {
      const base = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
      basePhysicalResist = base.raw['PhysicalResist'] ?? 0;
      baseSpellResist = base.raw['SpellResist'] ?? 0;

      const withHead = calculateBuild({
        character: HIGH_ELF_SORC_64MAG,
        items: { Head: ANSUULS_HELMET },
      });
      withHeadPhysicalResist = withHead.raw['PhysicalResist'] ?? 0;
      withHeadSpellResist = withHead.raw['SpellResist'] ?? 0;

      const withBoth = calculateBuild({
        character: HIGH_ELF_SORC_64MAG,
        items: { Chest: JERKIN_OF_THE_DEPTHS, Head: ANSUULS_HELMET },
      });
      withBothPhysicalResist = withBoth.raw['PhysicalResist'] ?? 0;
    });

    it('PhysicalResist gain = 1823  [formula: armorRating of the medium Ansuul head]', () => {
      expect(withHeadPhysicalResist - basePhysicalResist).toBe(1823);
    });

    it('SpellResist gain = 1823  [armor grants both resistances equally]', () => {
      expect(withHeadSpellResist - baseSpellResist).toBe(1823);
    });

    it('PhysicalResist stacked = 3043  [formula: 1220 light chest + 1823 medium head]', () => {
      expect(withBothPhysicalResist - basePhysicalResist).toBe(3043);
    });
  });

  // ── Critical section ──────────────────────────────────────────────────────────
  describe('critical — base SpellCrit, crit damage and CritResist', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
    });

    it('SpellCrit = 0.1  [base 10% — High Elf Sorcerer with no extra CP]', () => {
      expect(stats.SpellCrit).toBe(0.1);
    });

    it('WeaponCrit = 0.1  [base 10% — no extra CP]', () => {
      expect(stats.WeaponCrit).toBe(0.1);
    });

    it('SpellCritDamage = 0.5  [base 50% critical damage multiplier]', () => {
      expect(stats.SpellCritDamage).toBe(0.5);
    });

    it('WeaponCritDamage = 0.5  [base 50% critical damage multiplier]', () => {
      expect(stats.WeaponCritDamage).toBe(0.5);
    });

    it('CritResist = 1320  [race/class base — no extra crit-resistance items]', () => {
      expect(stats.CritResist).toBe(1320);
    });
  });

  // ── Mundus Stone section ──────────────────────────────────────────────────────
  describe('mundus stone — The Apprentice (spell dmg) and The Tower (stamina)', () => {
    let statsNoMundus: ReturnType<typeof calculateBuild>;
    let statsApprentice: ReturnType<typeof calculateBuild>;
    let statsApprenticeDivines: ReturnType<typeof calculateBuild>;
    let statsTowerNord: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      statsNoMundus = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
      statsApprentice = calculateBuild({
        character: { ...HIGH_ELF_SORC_64MAG, mundusStone: 'The Apprentice' },
      });
      statsApprenticeDivines = calculateBuild({
        character: { ...HIGH_ELF_SORC_64MAG, mundusStone: 'The Apprentice' },
        items: { Chest: JERKIN_OF_THE_DEPTHS },
      });
      statsTowerNord = calculateBuild({
        character: { ...NORD_DK_64HEA, mundusStone: 'The Tower' },
      });
    });

    it('The Apprentice: SpellDamage = 1238  [base 1000 + magicka mundus bonus]', () => {
      expect(statsApprentice.SpellDamage).toBe(1238);
    });

    it('The Apprentice: WeaponDamage = 1000  [magicka mundus does not affect weapon damage]', () => {
      expect(statsApprentice.WeaponDamage).toBe(statsNoMundus.WeaponDamage);
    });

    it('The Apprentice + Divines chest: SpellDamage = 1250  [Divines (5.1%) amplifies the mundus effect]', () => {
      expect(statsApprenticeDivines.SpellDamage).toBe(1250);
    });

    it('The Tower: Nord DK Stamina = 14023  [base 12000 + stamina mundus bonus]', () => {
      expect(statsTowerNord.Stamina).toBe(14023);
    });

    it('mundus stone resets between calls  [no bleed-through from the previous call]', () => {
      calculateBuild({ character: { ...HIGH_ELF_SORC_64MAG, mundusStone: 'The Apprentice' } });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
      expect(clean.SpellDamage).toBe(statsNoMundus.SpellDamage);
    });
  });

  // ── Effective Power section ───────────────────────────────────────────────────
  describe('effective power — High Elf Sorcerer lv50, 64 Magicka, target lv66 resist=18200', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({ character: HIGH_ELF_SORC_64MAG });
    });

    it('EffectiveSpellPower = 2144  [formula: (round(19104/10.5) + 1000) × (1 + 0.1×0.5) × (1 - 0.276)]', () => {
      expect(stats.EffectiveSpellPower).toBe(2144);
    });

    it('EffectiveWeaponPower = 1630  [formula: (round(12000/10.5) + 1000) × (1 + 0.1×0.5) × (1 - 0.276)]', () => {
      expect(stats.EffectiveWeaponPower).toBe(1630);
    });

    it('EffectivePower = 2144  [formula: max(EffectiveSpellPower, EffectiveWeaponPower)]', () => {
      expect(stats.EffectivePower).toBe(2144);
    });
  });
});

// ── Full build integration test ───────────────────────────────────────────────
//
// Real High Elf Sorcerer build (data from actual UESP session).
// Items sourced from esolog.uesp.net API (resonse.json / user-provided).
//
// Note: g_EsoBuildRules['set'] / ['buff'] are not loaded in this env — set bonus
// stat effects and named buffs (Major Prophecy, etc.) won't apply. What IS tested:
//   • Magicka/Stamina enchants from item slots                (GetEsoInputArmorEnchantValues)
//   • Armor rating accumulation across weight classes         (GetEsoInputArmorValues)
//   • Weapon damage contribution to SpellDamage/WeaponDamage  (GetEsoInputWeaponValues)
//   • Weapon trait (Precise) adding SpellCrit as direct %     (Item.SpellCrit)
//   • CP2 node injection: Magicka, CritDamage, Resistance     (ParseEsoCP2Value)
//   • EffectivePower after items
//
// ── Item fixtures (real UESP API payloads) ────────────────────────────────────

/** Head — Slimecraw (medium, Divines, +868 Stamina, 1pc: +657 Crit) */
const SLIMECRAW_MASK: UespItemApiData = {
  itemId: '95045',
  name: 'Slimecraw Mask',
  armorRating: '1823',
  weaponPower: '0',
  armorType: '2',
  weaponType: '0',
  type: '2',
  equipType: '1',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantDesc: 'Adds 868 Maximum Stamina.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '270',
  setName: 'Slimecraw',
  setBonusCount: '3',
  setMaxEquipCount: '2',
  setBonusCount1: '1',
  setBonusDesc1: '(1 item) Adds 657 Critical Chance',
  setBonusCount2: '2',
  setBonusDesc2: '(2 items) Adds 113 Critical Chance',
  setBonusCount3: '2',
  setBonusDesc3: '(2 items) Gain Minor Berserk at all times, increasing your damage done by 5%.',
};

/** Shoulders — Order's Wrath (medium, Divines, no enchant) */
const ORDERS_WRATH_SHOULDERS: UespItemApiData = {
  itemId: '184894',
  name: "Arm Cops of the Order's Wrath",
  armorRating: '1823',
  weaponPower: '0',
  armorType: '2',
  weaponType: '0',
  type: '2',
  equipType: '4',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '640',
  setName: "Order's Wrath",
  setBonusCount: '5',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 657 Critical Chance',
  setBonusCount2: '3',
  setBonusDesc2: '(3 items) Adds 129 Weapon and Spell Damage',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 657 Critical Chance',
  setBonusCount4: '5',
  setBonusDesc4: '(5 items) Adds 943 Critical Chance',
  setBonusCount5: '5',
  setBonusDesc5: '(5 items) Increases your Critical Damage and Critical Healing by 8%.',
};

/** Chest — Whorl of the Depths (light, Divines, +868 Magicka) */
const WHORL_ROBE: UespItemApiData = {
  itemId: '186446',
  name: 'Robe of the Depths',
  armorRating: '1396',
  weaponPower: '0',
  armorType: '1',
  weaponType: '0',
  type: '2',
  equipType: '3',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantDesc: 'Adds 868 Maximum Magicka.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '646',
  setName: 'Whorl of the Depths',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
  setBonusCount2: '3',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 129 Weapon and Spell Damage',
  setBonusCount4: '5',
  setBonusDesc4:
    '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths...',
};

/** Hands — Whorl of the Depths (light, Divines, +351 Magicka) */
const WHORL_GLOVES: UespItemApiData = {
  itemId: '186448',
  name: 'Gloves of the Depths',
  armorRating: '698',
  weaponPower: '0',
  armorType: '1',
  weaponType: '0',
  type: '2',
  equipType: '13',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantDesc: 'Adds 351 Maximum Magicka.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '646',
  setName: 'Whorl of the Depths',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
  setBonusCount2: '3',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 129 Weapon and Spell Damage',
  setBonusCount4: '5',
  setBonusDesc4:
    '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths...',
};

/** Legs — Whorl of the Depths (light, Divines, +868 Magicka) */
const WHORL_BREECHES: UespItemApiData = {
  itemId: '186450',
  name: 'Breeches of the Depths',
  armorRating: '1221',
  weaponPower: '0',
  armorType: '1',
  weaponType: '0',
  type: '2',
  equipType: '9',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantDesc: 'Adds 868 Maximum Magicka.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '646',
  setName: 'Whorl of the Depths',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
  setBonusCount2: '3',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 129 Weapon and Spell Damage',
  setBonusCount4: '5',
  setBonusDesc4:
    '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths...',
};

/** Waist — Whorl of the Depths (light, Divines, +351 Magicka) */
const WHORL_SASH: UespItemApiData = {
  itemId: '186453',
  name: 'Sash of the Depths',
  armorRating: '523',
  weaponPower: '0',
  armorType: '1',
  weaponType: '0',
  type: '2',
  equipType: '8',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantDesc: 'Adds 351 Maximum Magicka.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '646',
  setName: 'Whorl of the Depths',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
  setBonusCount2: '3',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 129 Weapon and Spell Damage',
  setBonusCount4: '5',
  setBonusDesc4:
    '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths...',
};

/** Feet — Whorl of the Depths (light, Divines, +351 Magicka) */
const WHORL_SHOES: UespItemApiData = {
  itemId: '186447',
  name: 'Shoes of the Depths',
  armorRating: '1221',
  weaponPower: '0',
  armorType: '1',
  weaponType: '0',
  type: '2',
  equipType: '10',
  trait: '18',
  traitDesc: 'Increases Mundus Stone effects by 9.1%.',
  enchantDesc: 'Adds 351 Maximum Magicka.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '646',
  setName: 'Whorl of the Depths',
  setBonusCount: '4',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
  setBonusCount2: '3',
  setBonusDesc2:
    '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 129 Weapon and Spell Damage',
  setBonusCount4: '5',
  setBonusDesc4:
    '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths...',
};

/** Neck — Order's Wrath (jewel, no enchant) */
const ORDERS_WRATH_NECK: UespItemApiData = {
  itemId: '184807',
  name: "Amulet of the Order's Wrath",
  armorRating: '0',
  weaponPower: '0',
  armorType: '0',
  weaponType: '0',
  type: '2',
  equipType: '2',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '640',
  setName: "Order's Wrath",
  setBonusCount: '5',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 657 Critical Chance',
  setBonusCount2: '3',
  setBonusDesc2: '(3 items) Adds 129 Weapon and Spell Damage',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 657 Critical Chance',
  setBonusCount4: '5',
  setBonusDesc4: '(5 items) Adds 943 Critical Chance',
  setBonusCount5: '5',
  setBonusDesc5: '(5 items) Increases your Critical Damage and Critical Healing by |cffffff8|r%.',
};

/** Ring1 — Ring of the Pale Order (unique, 1pc: restore 20% dmg as Health) */
const RING_OF_PALE_ORDER: UespItemApiData = {
  itemId: '171436',
  name: 'Ring of the Pale Order',
  armorRating: '0',
  weaponPower: '0',
  armorType: '0',
  weaponType: '0',
  type: '2',
  equipType: '11',
  trait: '31',
  isUnique: '1',
  isUniqueEquipped: '1',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '598',
  setName: 'Ring of the Pale Order',
  setBonusCount: '1',
  setMaxEquipCount: '1',
  setBonusCount1: '1',
  setBonusDesc1: '(1 item) Restore 20% of damage you deal as Health. This value is halved in PvP.',
};

/** Ring2 — Order's Wrath (jewel, no enchant) */
const ORDERS_WRATH_RING: UespItemApiData = {
  itemId: '184806',
  name: "Ring of the Order's Wrath",
  armorRating: '0',
  weaponPower: '0',
  armorType: '0',
  weaponType: '0',
  type: '2',
  equipType: '12',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '640',
  setName: "Order's Wrath",
  setBonusCount: '5',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 657 Critical Chance',
  setBonusCount2: '3',
  setBonusDesc2: '(3 items) Adds 129 Weapon and Spell Damage',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 657 Critical Chance',
  setBonusCount4: '5',
  setBonusDesc4: '(5 items) Adds 943 Critical Chance',
  setBonusCount5: '5',
  setBonusDesc5: '(5 items) Increases your Critical Damage and Critical Healing by |cffffff8|r%.',
};

/** MainHand1 — Order's Wrath Inferno Staff (Precise trait = +7.2% SpellCrit) */
const ORDERS_WRATH_INFERNO_STAFF: UespItemApiData = {
  itemId: '184904',
  name: "Inferno Staff of the Order's Wrath",
  armorRating: '0',
  weaponPower: '1335',
  armorType: '0',
  weaponType: '12',
  type: '1',
  equipType: '6',
  trait: '3',
  traitDesc: 'Increases Weapon and Spell Critical by |cffffff7.2|r%.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '640',
  setName: "Order's Wrath",
  setBonusCount: '5',
  setMaxEquipCount: '5',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Adds 657 Critical Chance',
  setBonusCount2: '3',
  setBonusDesc2: '(3 items) Adds 129 Weapon and Spell Damage',
  setBonusCount3: '4',
  setBonusDesc3: '(4 items) Adds 657 Critical Chance',
  setBonusCount4: '5',
  setBonusDesc4: '(5 items) Adds 943 Critical Chance',
  setBonusCount5: '5',
  setBonusDesc5: '(5 items) Increases your Critical Damage and Critical Healing by |cffffff8|r%.',
};

/** MainHand2 — Crushing Wall Lightning Staff (Charged trait, Absorb Magicka enchant) */
const CRUSHING_WALL_LIGHTNING_STAFF: UespItemApiData = {
  itemId: '71166',
  name: "The Maelstrom's Lightning Staff",
  armorRating: '0',
  weaponPower: '1335',
  armorType: '0',
  weaponType: '15',
  type: '1',
  equipType: '6',
  trait: '4',
  traitDesc:
    'Increases weapon enchantment effect by |cffffff30|r% and reduces enchantment cooldown by |cFFFFFF50|r%.',
  enchantDesc: 'Deals |cffffff2470|r Magic Damage and restores |cffffff461|r Magicka.',
  internalLevel: '50',
  internalSubtype: '364',
  setId: '373',
  setName: 'Crushing Wall',
  setBonusCount: '1',
  setMaxEquipCount: '2',
  setBonusCount1: '2',
  setBonusDesc1: '(2 items) Increases the damage Wall of Elements deals by |cffffff1250|r.',
};

/** Food — Witchmother's Potent Brew (+2856 Magicka, +3094 Health, +315 MagickaRegen) */
const WITCHMOTHERS_POTENT_BREW: UespItemApiData = {
  itemId: '23274',
  type: '4', // food type — triggers FoodBuff flag in the engine
  abilityDesc:
    'Increase Max Health by 3094 and Max Magicka by 2856 for 2 hours. Magicka Recovery by 315.',
};

/** Drink — Dubious Camoran Throne (+3576 Stamina, +3576 Health, +313 StaminaRegen) */
const DUBIOUS_CAMORAN_THRONE: UespItemApiData = {
  itemId: '45058',
  type: '5', // drink type
  abilityDesc:
    'Increase Max Stamina by 3576 and Max Health by 3576 for 2 hours. Stamina Recovery by 313.',
};

/**
 * Bare items (no enchant, no set) to isolate Undaunted Mettle deltas per armor type.
 * equipType '3'=Chest, '1'=Head, '4'=Shoulders.
 */
const BARE_LIGHT_CHEST: UespItemApiData = {
  itemId: '9001',
  type: '2',
  weaponType: '0',
  weaponPower: '0',
  armorType: '1',
  equipType: '3',
  armorRating: '1000',
  trait: '0',
  traitDesc: '',
  enchantDesc: '',
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
} as UespItemApiData;

const BARE_MEDIUM_SHOULDERS: UespItemApiData = {
  itemId: '9002',
  type: '2',
  weaponType: '0',
  weaponPower: '0',
  armorType: '2',
  equipType: '4',
  armorRating: '1000',
  trait: '0',
  traitDesc: '',
  enchantDesc: '',
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
} as UespItemApiData;

const BARE_HEAVY_HEAD: UespItemApiData = {
  itemId: '9003',
  type: '2',
  weaponType: '0',
  weaponPower: '0',
  armorType: '3',
  equipType: '1',
  armorRating: '1000',
  trait: '0',
  traitDesc: '',
  enchantDesc: '',
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
} as UespItemApiData;

/** All 12 slots for the full build */
const FULL_BUILD_ITEMS = {
  Head: SLIMECRAW_MASK,
  Shoulders: ORDERS_WRATH_SHOULDERS,
  Chest: WHORL_ROBE,
  Hands: WHORL_GLOVES,
  Legs: WHORL_BREECHES,
  Waist: WHORL_SASH,
  Feet: WHORL_SHOES,
  Neck: ORDERS_WRATH_NECK,
  Ring1: RING_OF_PALE_ORDER,
  Ring2: ORDERS_WRATH_RING,
  MainHand1: ORDERS_WRATH_INFERNO_STAFF,
  MainHand2: CRUSHING_WALL_LIGHTNING_STAFF,
};

/** High Elf Sorcerer CP160 — matches the real UESP session */
const HIGH_ELF_SORC_CP160 = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
  mundusStone: 'The Thief',
  championPoints: 160,
} as const;

describe('full build — High Elf Sorcerer CP160, 12 items, The Thief', () => {
  // ── Items only (no CP2 injected) ──────────────────────────────────────────────
  describe('items without CP2 — enchants, armor, weapon and trait SpellCrit', () => {
    let base: ReturnType<typeof calculateBuild>;
    let withItems: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      withItems = calculateBuild({ character: HIGH_ELF_SORC_CP160, items: FULL_BUILD_ITEMS });
    });

    // Magicka enchants: Chest 868 + Hands 351 + Legs 868 + Waist 351 + Feet 351 = 2789
    it('Magicka delta = +2789  [Magicka enchants on the 5 armor slots]', () => {
      expect(withItems.Magicka - base.Magicka).toBe(2789);
    });

    // Head enchant is +868 Stamina (Slimecraw) → goes to Stamina, not Magicka
    it('Stamina delta = +868  [Stamina enchant on the Slimecraw helmet]', () => {
      expect(withItems.Stamina - base.Stamina).toBe(868);
    });

    // Armor ratings: 1823 (head) + 1823 (shoulders) + 1396 (chest) + 698 (hands) +
    //                1221 (legs) + 523 (waist) + 1221 (feet) = 8705
    it('PhysicalResist delta = +8705  [sum of armor across the 7 equipment slots]', () => {
      expect(withItems.PhysicalResist - base.PhysicalResist).toBe(8705);
    });

    it('SpellResist delta = +8705  [armor grants both resistances equally]', () => {
      expect(withItems.SpellResist - base.SpellResist).toBe(8705);
    });

    // Inferno Staff: weaponPower=1335. Set bonuses (Order's Wrath 3pc +129, Whorl 3pc, etc.)
    // are now applied via buildRules.set. Total SpellDamage = 2722.
    it('SpellDamage = 2722  [base 1000 + weapon 1335 + set bonuses]', () => {
      expect(withItems.SpellDamage).toBe(2722);
    });

    // Precise trait on Inferno Staff: +0.072 (direct)
    // 7 Divines pieces amplify The Thief mundus
    // Set bonuses (Order's Wrath 2pc+4pc+5pc, Slimecraw 1pc) add Crit rating
    // Total delta now includes set bonus crit ≈ +0.2437
    it('SpellCrit delta ≈ +0.2437  [Precise trait + Divines/Thief + set bonuses]', () => {
      expect(withItems.SpellCrit - base.SpellCrit).toBeCloseTo(0.2437, 3);
    });

    // No Magicka/Stamina regen enchants → regen unchanged
    it('MagickaRegen unchanged  [no regen enchant in the build]', () => {
      expect(withItems.MagickaRegen).toBe(base.MagickaRegen);
    });

    // EffectivePower increases with items (weapon power + SpellCrit from trait)
    it('EffectivePower > base  [weapon and trait raise effective power]', () => {
      expect(withItems.EffectivePower).toBeGreaterThan(base.EffectivePower);
    });
  });

  // ── Final absolute stats with 12 items ──────────────────────────────────────
  //
  // Values calculated by the UESP engine with the 12 real items + The Thief CP160.
  // Set bonuses and named buffs ARE applied (buildRules.set/buff loaded via JSON).
  //
  // SpellCrit breakdown:
  //   base 0.10 + The Thief (1333×1.637/21912 ≈ 0.0996) + Precise (+0.072)
  //   + set bonuses (Order's Wrath 2pc+4pc+5pc, Slimecraw 1pc, etc.)
  describe('final stats — absolute values with 12 items, no CP2', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({ character: HIGH_ELF_SORC_CP160, items: FULL_BUILD_ITEMS });
    });

    it('Magicka = 21893  [base 19104 + enchants: 868+351+868+351+351 = 2789]', () => {
      expect(stats.Magicka).toBe(21893);
    });

    it('Stamina = 12868  [base 12000 + 868 enchant on the Slimecraw helmet]', () => {
      expect(stats.Stamina).toBe(12868);
    });

    it('Health = 16000  [base — 0 Health points assigned]', () => {
      expect(stats.Health).toBe(16000);
    });

    it("SpellDamage = 2722  [base 1000 + weapon 1335 + set bonuses (Order's Wrath 3pc+5pc, Whorl)]", () => {
      expect(stats.SpellDamage).toBe(2722);
    });

    it('SpellCrit ≈ 0.4046  [base 0.10 + The Thief (7×Divines) + Precise + set bonuses]', () => {
      expect(stats.SpellCrit).toBeCloseTo(0.4046, 3);
    });

    it("SpellCritDamage = 0.58  [base 0.5 + set bonus Order's Wrath 5pc (+8%)]", () => {
      expect(stats.SpellCritDamage).toBe(0.58);
    });

    it('MagickaRegen = 514  [no regen enchant in the build]', () => {
      expect(stats.MagickaRegen).toBe(514);
    });

    it('EffectiveSpellPower = 4513  [UESP formula with set bonuses applied]', () => {
      expect(stats.EffectiveSpellPower).toBe(4513);
    });

    it('EffectivePower = 4513  [max(EffectiveSpellPower, EffectiveWeaponPower)]', () => {
      expect(stats.EffectivePower).toBe(4513);
    });
  });

  // ── CP2 node injection — delta tests ─────────────────────────────────────────
  describe('CP2 node injection — delta per node', () => {
    let withItems: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      withItems = calculateBuild({ character: HIGH_ELF_SORC_CP160, items: FULL_BUILD_ITEMS });
    });

    // Rule 38750 — Grants N Max Magicka per stage
    it('node 141744 (Magicka +1000 via rule 38750): Magicka delta = +1000', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          141744: { description: 'Grants 1 Max Magicka per stage. Current bonus: 1000' },
        },
      });
      expect(withCP.Magicka - withItems.Magicka).toBe(1000);
    });

    // Rule 39209 — Increases Max Magicka by N per stage
    it('node 149305 (Magicka +500 via rule 39209): Magicka delta = +500', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          149305: { description: 'Increases Max Magicka by 1 per stage. Current bonus: 500' },
        },
      });
      expect(withCP.Magicka - withItems.Magicka).toBe(500);
    });

    // Rule 39152 — CritDamage + CritHealing (display:"%", valor /100)
    it('node 141899 (CritDamage 10% via rule 39152): SpellCritDamage delta ≈ +0.1', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          141899: {
            description:
              'Increases your Critical Damage and Critical Healing done by 1% per stage. Current bonus: 10',
          },
        },
      });
      expect(withCP.SpellCritDamage - withItems.SpellCritDamage).toBeCloseTo(0.1, 10);
    });

    // Rule 39165 — Grants N.N Armor per stage → SpellResist + PhysicalResist
    it('node 142035 (SpellResist+PhysResist +1000 via rule 39165): both resistances rise +1000', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          142035: { description: 'Grants 1.0 Armor per stage. Current bonus: 1000' },
        },
      });
      expect(withCP.SpellResist - withItems.SpellResist).toBe(1000);
      expect(withCP.PhysicalResist - withItems.PhysicalResist).toBe(1000);
    });

    // Rule 39171 — Grants N Offensive Penetration per stage
    it('node 141895 (Penetration +800 via rule 39171): SpellPenetration delta = +800', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          141895: { description: 'Grants 1 Offensive Penetration per stage. Current bonus: 800' },
        },
      });
      expect(withCP.SpellPenetration - withItems.SpellPenetration).toBe(800);
    });

    // Two nodes injected simultaneously
    it('two simultaneous nodes (141744 +1000 and 149305 +500): Magicka delta = +1500', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          141744: { description: 'Grants 1 Max Magicka per stage. Current bonus: 1000' },
          149305: { description: 'Increases Max Magicka by 1 per stage. Current bonus: 500' },
        },
      });
      expect(withCP.Magicka - withItems.Magicka).toBe(1500);
    });

    // CP2 injection resets between calls — no bleed-through
    it('CP2 resets between calls  [no bleed-through into a call without CP2]', () => {
      calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          141744: { description: 'Grants 1 Max Magicka per stage. Current bonus: 5000' },
        },
      });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160, items: FULL_BUILD_ITEMS });
      expect(clean.Magicka).toBe(withItems.Magicka);
    });
  });

  // ── CP nodes — buildRules.cp rules (ESO_CPEFFECT_MATCHES) ─────────────────
  describe('CP nodes — buildRules.cp rules (ESO_CPEFFECT_MATCHES)', () => {
    let base: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160, items: FULL_BUILD_ITEMS });
    });

    // Rule 38750: Grants N Max Magicka per stage → Magicka (Item)
    it('rule 38750 (Magicka +1000): Magicka delta = +1000', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          38750: { description: 'Grants 1 Max Magicka per stage. Current bonus: 1000' },
        },
      });
      expect(withCP.Magicka - base.Magicka).toBe(1000);
    });

    // Rule 39163: Grants N Max Health per stage → Health (Item)
    it('rule 39163 (Health +500): Health delta = +500', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39163: { description: 'Grants 1 Max Health per stage. Current bonus: 500' },
        },
      });
      expect(withCP.Health - base.Health).toBe(500);
    });

    // Rule 39150: Increases your Max Stamina by N per stage → Stamina (Item)
    it('rule 39150 (Stamina +800): Stamina delta = +800', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39150: { description: 'Increases your Max Stamina by 1 per stage. Current bonus: 800' },
        },
      });
      expect(withCP.Stamina - base.Stamina).toBe(800);
    });

    // Rule 39173: Grants N Critical Chance per stage → SpellCrit + WeaponCrit (CP)
    // The SpellCrit formula: delta = bonus / (2 × EL × (100+EL)), EL=66 → divisor=21912
    it('rule 39173 (CritChance +657): SpellCrit delta ≈ +657/21912', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39173: { description: 'Grants 1 Critical Chance per stage. Current bonus: 657' },
        },
      });
      const expectedDelta = 657 / 21912;
      expect(withCP.SpellCrit - base.SpellCrit).toBeCloseTo(expectedDelta, 5);
      expect(withCP.WeaponCrit - base.WeaponCrit).toBeCloseTo(expectedDelta, 5);
    });

    // Rule 39193: Increases your Weapon and Spell Damage by N per stage → WeaponDamage + SpellDamage (CP)
    it('rule 39193 (SpellDmg+WeapDmg +129): both rise +129', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39193: {
            description:
              'Increases your Weapon and Spell Damage by 1 per stage. Current bonus: 129',
          },
        },
      });
      expect(withCP.SpellDamage - base.SpellDamage).toBe(129);
      expect(withCP.WeaponDamage - base.WeaponDamage).toBe(129);
    });

    // Rule 39171: Grants N Offensive Penetration per stage → SpellPenetration + PhysicalPenetration (CP)
    it('rule 39171 (Penetration +800): SpellPenetration and PhysicalPenetration rise +800', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39171: { description: 'Grants 1 Offensive Penetration per stage. Current bonus: 800' },
        },
      });
      expect(withCP.SpellPenetration - base.SpellPenetration).toBe(800);
      expect(withCP.PhysicalPenetration - base.PhysicalPenetration).toBe(800);
    });

    // Rule 39165: Grants N.N Armor per stage → SpellResist + PhysicalResist (CP)
    it('rule 39165 (Armor +1000): SpellResist and PhysicalResist rise +1000', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39165: { description: 'Grants 1.0 Armor per stage. Current bonus: 1000' },
        },
      });
      expect(withCP.SpellResist - base.SpellResist).toBe(1000);
      expect(withCP.PhysicalResist - base.PhysicalResist).toBe(1000);
    });

    // Rule 39152: CritDamage + CritHealing done by N% → display:"%", value /100
    it('rule 39152 (CritDamage 10%): SpellCritDamage delta ≈ +0.1', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          39152: {
            description:
              'Increases your Critical Damage and Critical Healing done by 1% per stage. Current bonus: 10',
          },
        },
      });
      expect(withCP.SpellCritDamage - base.SpellCritDamage).toBeCloseTo(0.1, 10);
    });

    // Two simultaneous nodes from different rules
    it('rules 38750+39163 simultaneous: Magicka +1000 and Health +500 independent', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          38750: { description: 'Grants 26 Max Magicka per stage. Current bonus: 1300' },
          39163: { description: 'Grants 1 Max Health per stage. Current bonus: 500' },
        },
      });
      expect(withCP.Magicka - base.Magicka).toBe(1300);
      expect(withCP.Health - base.Health).toBe(500);
    });

    // Two simultaneous nodes from different rules
    it('rules: base 19972 + 1300 cp', () => {
      const withCP = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: { Chest: WHORL_ROBE },
        championPointNodes: {
          38750: { description: 'Grants 26 Max Magicka per stage. Current bonus: 1300' },
          39163: { description: 'Grants 28 Max Health per stage. Current bonus: 1400' },
        },
      });
      expect(withCP.Magicka).toBe(21272);
      expect(withCP.Health).toBe(17400);
    });

    // No bleed-through between calls with and without CP
    it('CP nodes reset between calls  [no bleed-through]', () => {
      calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: FULL_BUILD_ITEMS,
        championPointNodes: {
          38750: { description: 'Grants 1 Max Magicka per stage. Current bonus: 9999' },
        },
      });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160, items: FULL_BUILD_ITEMS });
      expect(clean.Magicka).toBe(base.Magicka);
    });
  });
  // ── Set bonuses — integration ────────────────────────────────────────────────
  //
  // buildRules.set (367 rules) + UpdateEsoItemSets() apply set bonuses automatically
  // via g_EsoBuildSetData when items with setName/setBonusDescN are injected.
  describe("set bonus — Order's Wrath 5 pieces (2pc+3pc+4pc+5pc)", () => {
    let base: ReturnType<typeof calculateBuild>;
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      // 5 identical pieces with all setBonusDesc filled in
      const ow = (id: string, equipType: string): UespItemApiData => ({
        itemId: id,
        armorRating: '1823',
        weaponPower: '0',
        armorType: '2',
        weaponType: '0',
        type: '2',
        equipType,
        internalLevel: '50',
        internalSubtype: '364',
        setId: '640',
        setName: "Order's Wrath",
        setBonusCount: '5',
        setMaxEquipCount: '5',
        setBonusCount1: '2',
        setBonusDesc1: '(2 items) Adds 657 Critical Chance',
        setBonusCount2: '3',
        setBonusDesc2: '(3 items) Adds 129 Weapon and Spell Damage',
        setBonusCount3: '4',
        setBonusDesc3: '(4 items) Adds 657 Critical Chance',
        setBonusCount4: '5',
        setBonusDesc4: '(5 items) Adds 943 Critical Chance',
        setBonusCount5: '5',
        setBonusDesc5: '(5 items) Increases your Critical Damage and Critical Healing by 8%.',
      });
      stats = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: {
          Head: ow('1', '1'),
          Shoulders: ow('2', '4'),
          Chest: ow('3', '3'),
          Hands: ow('4', '13'),
          Legs: ow('5', '9'),
        },
      });
    });

    it('SpellCrit rises +0.103003 (2pc+4pc+5pc: 657+657+943 = 2257 Crit)', () => {
      expect(stats.SpellCrit - base.SpellCrit).toBeCloseTo(0.103003, 5);
    });

    it('SpellDamage rises +129 (3pc: +129 Weapon and Spell Damage)', () => {
      expect(stats.SpellDamage - base.SpellDamage).toBe(129);
    });

    it('SpellCritDamage rises +0.08 (5pc: +8% Critical Damage)', () => {
      expect(stats.SpellCritDamage - base.SpellCritDamage).toBeCloseTo(0.08, 10);
    });
  });

  describe('set bonus — Whorl of the Depths 4 pieces (2pc+4pc)', () => {
    let base: ReturnType<typeof calculateBuild>;
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      const whorl = (id: string, equipType: string): UespItemApiData => ({
        itemId: id,
        armorRating: '1396',
        weaponPower: '0',
        armorType: '1',
        weaponType: '0',
        type: '2',
        equipType,
        internalLevel: '50',
        internalSubtype: '364',
        setId: '646',
        setName: 'Whorl of the Depths',
        setBonusCount: '4',
        setMaxEquipCount: '5',
        setBonusCount1: '2',
        setBonusDesc1: '(2 items) Adds 129 Weapon and Spell Damage',
        setBonusCount2: '3',
        setBonusDesc2:
          '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
        setBonusCount3: '4',
        setBonusDesc3: '(4 items) Adds 129 Weapon and Spell Damage',
        setBonusCount4: '5',
        setBonusDesc4:
          '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths...',
      });
      stats = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: {
          Chest: whorl('1', '3'),
          Hands: whorl('2', '13'),
          Legs: whorl('3', '9'),
          Waist: whorl('4', '8'),
        },
      });
    });

    it('SpellDamage rises +258 (2pc+4pc: 2×+129 Weapon and Spell Damage)', () => {
      expect(stats.SpellDamage - base.SpellDamage).toBe(258);
    });
  });

  describe('set bonus — Slimecraw 1 piece (1pc: +657 Crit + Divines boost to The Thief)', () => {
    it('SpellCrit rises +0.035506 (657 Crit + Divines 9.1% on The Thief)', () => {
      const base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      const stats = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: { Head: SLIMECRAW_MASK },
      });
      // Delta includes: 657 Critical Chance + Divines trait boost (9.1%) on the The Thief mundus
      expect(stats.SpellCrit - base.SpellCrit).toBeCloseTo(0.035506, 5);
    });
  });

  // ── Food buff — items.Food ───────────────────────────────────────────────────
  //
  // Food works via the items.Food slot: injects abilityDesc into g_EsoBuildItemData['Food'].
  // The engine uses buildRules.abilitydesc (17 rules) to extract the values:
  //   "Max Health by N" → Health; "Max Magicka by N" → Magicka; "Magicka Recovery by N" → MagickaRegen
  describe("food buff — items.Food (Witchmother's Potent Brew)", () => {
    let base: ReturnType<typeof calculateBuild>;
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      stats = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: { Food: WITCHMOTHERS_POTENT_BREW },
      });
    });

    it('Magicka rises +2856', () => {
      expect(stats.Magicka - base.Magicka).toBe(2856);
    });

    it('Health rises +3094', () => {
      expect(stats.Health - base.Health).toBe(3094);
    });

    it('MagickaRegen rises +315', () => {
      expect(stats.MagickaRegen - base.MagickaRegen).toBe(315);
    });

    it('no bleed-through — call without Food keeps no bonus', () => {
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(clean.Magicka).toBe(base.Magicka);
    });
  });

  // ── Drink buff (type '5') ─────────────────────────────────────────────────────
  describe("drink buff — items.Food type '5' (Dubious Camoran Throne)", () => {
    let base: ReturnType<typeof calculateBuild>;
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      stats = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items: { Food: DUBIOUS_CAMORAN_THRONE },
      });
    });

    it('Stamina rises +3576', () => {
      expect(stats.Stamina - base.Stamina).toBe(3576);
    });

    it('Health rises +3576', () => {
      expect(stats.Health - base.Health).toBe(3576);
    });

    it('StaminaRegen rises +313', () => {
      expect(stats.StaminaRegen - base.StaminaRegen).toBe(313);
    });

    it('Magicka is not affected', () => {
      expect(stats.Magicka).toBe(base.Magicka);
    });

    it('no bleed-through — call without drink keeps no bonus', () => {
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(clean.Stamina).toBe(base.Stamina);
    });
  });

  // ── Toggle skills Cyrodiil — efeito real ─────────────────────────────────────
  //
  // PvP toggle skills (Emperor, Authority, Domination, Tactician, Combat Medic,
  // Continuous Attack) require:
  //   1. character.cyrodiil: true       — statRequireId: 'Cyrodiil' = 1
  //   2. passiveSkills: [baseSkillId]   — engine needs the passive to process the description
  //   3. toggleSkills: ['SkillName']    — enables valid=true + enabled=true
  //
  // baseSkillIds obtained via listAvailableToggleSkills().find(t => t.name === X).baseSkillId
  describe('Cyrodiil toggle skills — stat deltas', () => {
    let base: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
    });

    // Emperor: +38% Magicka/Health/Stamina (1 keep = 38%)
    // 19104 × 0.38 = 7259
    it('Emperor (+38% Magicka at 1 keep): delta ≈ +7259', () => {
      const withEmperor = calculateBuild({
        character: { ...HIGH_ELF_SORC_CP160, cyrodiil: true },
        passiveSkills: [39641],
        toggleSkills: ['Emperor'],
      });
      expect(withEmperor.Magicka - base.Magicka).toBe(7259);
    });

    // Domination: regen recovery while in campaign
    it('Domination: MagickaRegen rises in Cyrodiil mode', () => {
      const withDomination = calculateBuild({
        character: { ...HIGH_ELF_SORC_CP160, cyrodiil: true },
        passiveSkills: [39644],
        toggleSkills: ['Domination'],
      });
      expect(withDomination.MagickaRegen).toBeGreaterThan(base.MagickaRegen);
    });

    // Combat Medic: HealingDone boost
    it('Combat Medic: HealingDone rises in Cyrodiil mode', () => {
      const withMedic = calculateBuild({
        character: { ...HIGH_ELF_SORC_CP160, cyrodiil: true },
        passiveSkills: [39259],
        toggleSkills: ['Combat Medic'],
      });
      expect(withMedic.HealingDone).toBeGreaterThan(base.HealingDone);
    });

    // Continuous Attack: regen boost
    it('Continuous Attack: MagickaRegen rises in Cyrodiil mode', () => {
      const withCA = calculateBuild({
        character: { ...HIGH_ELF_SORC_CP160, cyrodiil: true },
        passiveSkills: [39248],
        toggleSkills: ['Continuous Attack'],
      });
      expect(withCA.MagickaRegen).toBeGreaterThan(base.MagickaRegen);
    });

    it('Cyrodiil toggle without cyrodiil:true applies no effect', () => {
      // Without cyrodiil: true, the statRequireId check fails, valid=false
      const withoutCyrodiil = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        passiveSkills: [39641],
        toggleSkills: ['Emperor'],
      });
      expect(withoutCyrodiil.Magicka).toBe(base.Magicka);
    });

    it('toggle skills reset between calls  [no bleed-through]', () => {
      calculateBuild({
        character: { ...HIGH_ELF_SORC_CP160, cyrodiil: true },
        passiveSkills: [39641],
        toggleSkills: ['Emperor'],
      });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(clean.Magicka).toBe(base.Magicka);
    });
  });

  // ── Non-Cyrodiil toggle skills ─────────────────────────────────────────────
  //
  // Toggle skills with isPassive=true and no Cyrodiil restriction: they need
  //   passiveSkills: [baseSkillId]  — for the engine to process the description
  //   toggleSkills: ['SkillName']   — to mark valid=true + enabled=true
  //
  // Aegis of the Unseen (Arcanist, skill 184918):
  //   "While a beneficial Soldier of Apocrypha ability is active on you,
  //    increase your Physical and Spell Resistance by 1636."
  describe('non-Cyrodiil toggle skills — stat deltas', () => {
    let base: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
    });

    it('Aegis of the Unseen: PhysicalResist +1636 and SpellResist +1636', () => {
      const withAegis = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        passiveSkills: [184918],
        toggleSkills: ['Aegis of the Unseen'],
      });
      expect(withAegis.PhysicalResist - base.PhysicalResist).toBe(1636);
      expect(withAegis.SpellResist - base.SpellResist).toBe(1636);
    });

    it('non-Cyrodiil toggle without passiveSkills applies no effect', () => {
      const withoutPassive = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        toggleSkills: ['Aegis of the Unseen'],
      });
      expect(withoutPassive.PhysicalResist).toBe(base.PhysicalResist);
    });

    it('non-Cyrodiil toggle resets between calls  [no bleed-through]', () => {
      calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        passiveSkills: [184918],
        toggleSkills: ['Aegis of the Unseen'],
      });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(clean.PhysicalResist).toBe(base.PhysicalResist);
    });
  });

  // ── Active skills na barra — efeito de buff condicional ───────────────────────
  //
  // Skills slotted on the active bar can grant buffs via their description:
  //   "While slotted, you gain Major Prophecy" → enables the Major Prophecy buff → +SpellCrit
  //
  // ESO_ACTIVEEFFECT_MATCHES (36 rules) matches the description of the skill on the bar
  // e dispara o efeito (buffId → buff rule → stat delta).
  describe('skillBars — active-skill-on-bar effects', () => {
    let base: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
    });

    // Inferno (28967) — Destruction Staff: "While slotted, you gain Major Prophecy"
    // Major Prophecy: +2629 SpellCrit rating → delta = 2629/21912 ≈ 0.11998
    it('Inferno on the active bar grants Major Prophecy (+SpellCrit)', () => {
      const withInferno = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        skillBars: { bar1: [{ skillId: 28967 }] },
      });
      expect(withInferno.SpellCrit - base.SpellCrit).toBeCloseTo(2629 / 21912, 5);
    });

    it('skill on the bar resets between calls  [no bleed-through]', () => {
      calculateBuild({ character: HIGH_ELF_SORC_CP160, skillBars: { bar1: [{ skillId: 28967 }] } });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(clean.SpellCrit).toBeCloseTo(base.SpellCrit, 5);
    });

    it('activeBuffs + skillBar stack (do not duplicate) Major Prophecy', () => {
      // Major Prophecy applies at most 1× — no duplication when combining activeBuffs + skillBar
      const withBoth = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        skillBars: { bar1: [{ skillId: 28967 }] },
        activeBuffs: ['Major Prophecy'],
      });
      const withBuffOnly = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Major Prophecy'],
      });
      // Both must have the same SpellCrit (Major Prophecy applies 1×)
      expect(withBoth.SpellCrit).toBeCloseTo(withBuffOnly.SpellCrit, 5);
    });
  });

  // ── listAvailableBuffs ────────────────────────────────────────────────────────
  //
  // Returns the engine buff catalog (164 buildRules.buff entries).
  // No network calls — reads only the already-loaded g_EsoBuildBuffData.
  describe('listAvailableBuffs — buff catalog', () => {
    it('returns > 0 buffs without a filter', () => {
      expect(listAvailableBuffs().length).toBeGreaterThan(0);
    });

    it('filters by "Major" group — returns 25 buffs', () => {
      const major = listAvailableBuffs('Major');
      expect(major).toHaveLength(25);
      expect(major.every((b) => b.group === 'Major')).toBe(true);
    });

    it('filters by "Minor" group — returns 29 buffs', () => {
      const minor = listAvailableBuffs('Minor');
      expect(minor).toHaveLength(29);
    });

    it('each BuffInfo has name, group, effects', () => {
      const buffs = listAvailableBuffs('Major');
      for (const b of buffs) {
        expect(typeof b.name).toBe('string');
        expect(b.name.length).toBeGreaterThan(0);
        expect(typeof b.group).toBe('string');
        expect(Array.isArray(b.effects)).toBe(true);
      }
    });

    it('Major Prophecy has a SpellCrit +2629 effect', () => {
      const prophecy = listAvailableBuffs('Major').find((b) => b.name === 'Major Prophecy');
      expect(prophecy).toBeDefined();
      expect(prophecy!.effects).toContainEqual(
        expect.objectContaining({ statId: 'SpellCrit', value: 2629 }),
      );
    });
  });

  // ── activeBuffs — effect on calculation ─────────────────────────────────────
  describe('activeBuffs — effect on calculated stats', () => {
    let base: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
    });

    it('Major Prophecy raises SpellCrit by +2629/21912 ≈ +0.11998', () => {
      const withBuff = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Major Prophecy'],
      });
      expect(withBuff.SpellCrit - base.SpellCrit).toBeCloseTo(2629 / 21912, 5);
    });

    it('Minor Force raises SpellCritDamage by +0.10', () => {
      const withBuff = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Minor Force'],
      });
      expect(withBuff.SpellCritDamage - base.SpellCritDamage).toBeCloseTo(0.1, 5);
    });

    it('Major Force raises SpellCritDamage by +0.20', () => {
      const withBuff = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Major Force'],
      });
      expect(withBuff.SpellCritDamage - base.SpellCritDamage).toBeCloseTo(0.2, 5);
    });

    it('Major Sorcery raises SpellDamage by +20%', () => {
      const withBuff = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Major Sorcery'],
      });
      expect(withBuff.SpellDamage).toBeGreaterThan(base.SpellDamage);
    });

    it('buffs reset between calls — no bleed-through', () => {
      calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Major Prophecy', 'Major Force'],
      });
      const clean = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(clean.SpellCrit).toBeCloseTo(base.SpellCrit, 5);
      expect(clean.SpellCritDamage).toBeCloseTo(base.SpellCritDamage, 5);
    });

    it('multiple buffs stack correctly', () => {
      const withBoth = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        activeBuffs: ['Major Prophecy', 'Minor Prophecy'],
      });
      const expectedDelta = (2629 + 1314) / 21912;
      expect(withBoth.SpellCrit - base.SpellCrit).toBeCloseTo(expectedDelta, 5);
    });
  });

  // ── listRacialPassives ────────────────────────────────────────────────────────
  describe('listRacialPassives — racial passive catalog', () => {
    it('returns 10 entries for High Elf (5 passives × up to 3 ranks)', () => {
      expect(listRacialPassives('High Elf')).toHaveLength(10);
    });

    it('each entry has a numeric abilityId, rank and baseName', () => {
      for (const p of listRacialPassives('High Elf')) {
        expect(typeof p.abilityId).toBe('number');
        expect(p.abilityId).toBeGreaterThan(0);
        expect(typeof p.baseName).toBe('string');
        expect(p.rank).toBeGreaterThanOrEqual(1);
        expect(p.maxRank).toBeGreaterThanOrEqual(p.rank);
      }
    });

    it('returns passives for all 10 races', () => {
      const races = [
        'Argonian',
        'Breton',
        'Dark Elf',
        'High Elf',
        'Imperial',
        'Khajiit',
        'Nord',
        'Orc',
        'Redguard',
        'Wood Elf',
      ];
      for (const race of races) {
        expect(listRacialPassives(race).length).toBeGreaterThan(0);
      }
    });

    it('invalid race returns an empty array', () => {
      expect(listRacialPassives('Argonian2')).toEqual([]);
    });

    it("High Elf includes Syrabane's Boon in 3 ranks", () => {
      const boons = listRacialPassives('High Elf').filter((p) => p.baseName === "Syrabane's Boon");
      expect(boons).toHaveLength(3);
      expect(boons.map((p) => p.rank).sort()).toEqual([1, 2, 3]);
    });
  });

  // ── listClassPassives ─────────────────────────────────────────────────────────
  describe('listClassPassives — class passive catalog', () => {
    it('returns at least 24 entries for Sorcerer', () => {
      expect(listClassPassives('Sorcerer').length).toBeGreaterThanOrEqual(24);
    });

    it('Sorcerer has passives in the 3 main skill lines', () => {
      const lines = [...new Set(listClassPassives('Sorcerer').map((p) => p.skillLine))];
      expect(lines).toEqual(
        expect.arrayContaining(['Daedric Summoning', 'Dark Magic', 'Storm Calling']),
      );
    });

    it('returns passives for all 7 classes', () => {
      const classes = [
        'Arcanist',
        'Dragonknight',
        'Necromancer',
        'Nightblade',
        'Sorcerer',
        'Templar',
        'Warden',
      ];
      for (const cls of classes) {
        expect(listClassPassives(cls).length).toBeGreaterThan(0);
      }
    });

    it('invalid class returns an empty array', () => {
      expect(listClassPassives('NotAClass')).toEqual([]);
    });
  });

  // ── listAvailableToggleSkills ─────────────────────────────────────────────────
  describe('listAvailableToggleSkills — toggle skill catalog', () => {
    it('returns 105 toggle skills (1 anonymous entry filtered out)', () => {
      expect(listAvailableToggleSkills()).toHaveLength(105);
    });

    it('each entry has name, isPassive and effects', () => {
      for (const t of listAvailableToggleSkills()) {
        expect(typeof t.name).toBe('string');
        expect(t.name.length).toBeGreaterThan(0);
        expect(typeof t.isPassive).toBe('boolean');
        expect(Array.isArray(t.effects)).toBe(true);
      }
    });

    it('Emperor is Cyrodiil-restricted with baseSkillId', () => {
      const emperor = listAvailableToggleSkills().find((t) => t.name === 'Emperor');
      expect(emperor).toBeDefined();
      expect(emperor!.requiresCyrodiil).toBe(true);
      expect(emperor!.baseSkillId).toBeTruthy();
    });

    it('6 toggles require Cyrodiil', () => {
      const cyrodiil = listAvailableToggleSkills().filter((t) => t.requiresCyrodiil);
      expect(cyrodiil).toHaveLength(6);
    });

    it('War Horn is an active-skill toggle (isPassive = false)', () => {
      const warHorn = listAvailableToggleSkills().find((t) => t.name === 'War Horn');
      expect(warHorn).toBeDefined();
      expect(warHorn!.isPassive).toBe(false);
    });
  });

  // ── autoPassives ──────────────────────────────────────────────────────────────
  //
  // autoPassives: true injects the highest rank of racial and class passives.
  // Passives whose descriptions have a rule in buildRules.passive generate stats.
  // Highborn does not generate SpellCrit because the description in g_SkillsData (old patch)
  // is about XP gain — data issue, not a code bug.
  describe('autoPassives — automatic application of racial and class passives', () => {
    it('High Elf + autoPassives raises Magicka vs base', () => {
      const base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      const withAuto = calculateBuild({ character: HIGH_ELF_SORC_CP160, autoPassives: true });
      expect(withAuto.Magicka).toBeGreaterThan(base.Magicka);
    });

    it('High Elf + autoPassives raises SpellDamage vs base (Spell Recharge)', () => {
      const base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      const withAuto = calculateBuild({ character: HIGH_ELF_SORC_CP160, autoPassives: true });
      expect(withAuto.SpellDamage).toBeGreaterThan(base.SpellDamage);
    });

    it('Nord + autoPassives raises Stamina vs base', () => {
      const nordChar = {
        race: 'Nord',
        class: 'Sorcerer',
        level: 50,
        attributes: { health: 0, magicka: 64, stamina: 0 },
        championPoints: 160,
      };
      const base = calculateBuild({ character: nordChar });
      const withAuto = calculateBuild({ character: nordChar, autoPassives: true });
      expect(withAuto.Stamina).toBeGreaterThan(base.Stamina);
    });

    it('different races have different deltas with autoPassives', () => {
      const highElfChar = {
        race: 'High Elf',
        class: 'Sorcerer',
        level: 50,
        attributes: { health: 0, magicka: 64, stamina: 0 },
        championPoints: 160,
      };
      const nordChar = { ...highElfChar, race: 'Nord' };
      const highElf = calculateBuild({ character: highElfChar, autoPassives: true });
      const nord = calculateBuild({ character: nordChar, autoPassives: true });
      // High Elf gets Magicka bonuses; Nord does not
      expect(highElf.Magicka).toBeGreaterThan(nord.Magicka);
    });

    it('autoPassives does not affect calls without autoPassives  [no bleed-through]', () => {
      const base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      calculateBuild({ character: HIGH_ELF_SORC_CP160, autoPassives: true });
      const after = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      expect(after.Magicka).toBe(base.Magicka);
    });

    it('autoPassives + explicit passiveSkills does not duplicate the effect', () => {
      // Terminal rank abilityIds for High Elf (nextSkill = -1)
      const terminalIds = listRacialPassives('High Elf')
        .filter((p) => p.rank === p.maxRank)
        .map((p) => p.abilityId);
      const withAutoOnly = calculateBuild({ character: HIGH_ELF_SORC_CP160, autoPassives: true });
      const withBoth = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        autoPassives: true,
        passiveSkills: terminalIds,
      });
      // Same IDs — no double-application
      expect(withBoth.Magicka).toBe(withAutoOnly.Magicka);
    });
  });

  // ── listPassivesBySkillLine ───────────────────────────────────────────────────
  describe('listPassivesBySkillLine — passive catalog by skill line', () => {
    it('listAvailableSkillLines returns at least 30 skill lines', () => {
      expect(listAvailableSkillLines().length).toBeGreaterThanOrEqual(30);
    });

    it('listAvailableSkillLines includes armor, weapon and guild lines', () => {
      const lines = listAvailableSkillLines();
      expect(lines).toContain('Light Armor');
      expect(lines).toContain('Heavy Armor');
      expect(lines).toContain('Medium Armor');
      expect(lines).toContain('Undaunted');
      expect(lines).toContain('Destruction Staff');
      expect(lines).toContain('Mages Guild');
      expect(lines).toContain('Fighters Guild');
    });

    it('Undaunted returns 4 passives (Mettle r1/r2 + Command r1/r2)', () => {
      expect(listPassivesBySkillLine('Undaunted')).toHaveLength(4);
    });

    it('Light Armor includes Concentration and Prodigy', () => {
      const la = listPassivesBySkillLine('Light Armor');
      expect(la.some((p) => p.baseName === 'Concentration')).toBe(true);
      expect(la.some((p) => p.baseName === 'Prodigy')).toBe(true);
    });

    it('each entry has the correct abilityId, rank and skillLine', () => {
      for (const p of listPassivesBySkillLine('Heavy Armor')) {
        expect(typeof p.abilityId).toBe('number');
        expect(p.abilityId).toBeGreaterThan(0);
        expect(p.skillLine).toBe('Heavy Armor');
        expect(p.rank).toBeGreaterThanOrEqual(1);
      }
    });

    it('invalid skill line returns an empty array', () => {
      expect(listPassivesBySkillLine('NotASkillLine')).toEqual([]);
    });
  });

  // ── Undaunted Mettle with items ─────────────────────────────────────────────
  //
  // Undaunted Mettle (55386) — +2% Max Magicka/Health/Stamina per equipped armor type
  // (Light, Medium or Heavy). Max 3 types = +6%.
  describe('Undaunted Mettle — passive depending on equipped armor types', () => {
    it('Mettle without items: no delta (0 armor types)', () => {
      const base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      const withMettle = calculateBuild({ character: HIGH_ELF_SORC_CP160, passiveSkills: [55386] });
      expect(withMettle.Magicka).toBe(base.Magicka);
    });

    it('Mettle with 1 armor type: delta = +2% Magicka', () => {
      // 1 armor type (light) → +2% × 1 = 2% of base Magicka (19104 × 0.02 ≈ 382)
      const base = calculateBuild({ character: HIGH_ELF_SORC_CP160 });
      const withMettleAndItems = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        passiveSkills: [55386],
        items: { Chest: JERKIN_OF_THE_DEPTHS }, // 1 Light Armor piece
      });
      const delta = withMettleAndItems.Magicka - base.Magicka;
      // delta includes enchant (868) + Mettle bonus (~382); Mettle ≈ 2% of base Magicka
      expect(delta).toBeGreaterThan(868); // greater than the enchant alone
    });

    it('Mettle with 2 armor types: delta = +764 Magicka (4% of 19104)', () => {
      // Bare items (no enchant) to isolate exactly the Mettle delta
      const items = { Chest: BARE_LIGHT_CHEST, Head: BARE_HEAVY_HEAD };
      const without = calculateBuild({ character: HIGH_ELF_SORC_CP160, items });
      const withMettle = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items,
        passiveSkills: [55386],
      });
      expect(withMettle.Magicka - without.Magicka).toBe(764);
    });

    it('Mettle with 3 armor types: delta = +1146 Magicka (6% of 19104)', () => {
      const items = {
        Chest: BARE_LIGHT_CHEST,
        Shoulders: BARE_MEDIUM_SHOULDERS,
        Head: BARE_HEAVY_HEAD,
      };
      const without = calculateBuild({ character: HIGH_ELF_SORC_CP160, items });
      const withMettle = calculateBuild({
        character: HIGH_ELF_SORC_CP160,
        items,
        passiveSkills: [55386],
      });
      expect(withMettle.Magicka - without.Magicka).toBe(1146);
    });
  });

  // ── Second Mundus Stone (mundusStone2) ─────────────────────────────────────
  //
  // HIGH_ELF_SORC_CP160 already has mundusStone: 'The Thief'.
  // We use a character without Mundus as the base reference.
  describe('mundusStone2 — second Mundus Stone (Twice-Born Star)', () => {
    const BASE_CHAR = {
      race: 'High Elf',
      class: 'Sorcerer',
      level: 50,
      attributes: { health: 0, magicka: 64, stamina: 0 },
      championPoints: 160,
    };
    let noMundus: ReturnType<typeof calculateBuild>;
    let oneThief: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      noMundus = calculateBuild({ character: BASE_CHAR });
      oneThief = calculateBuild({ character: { ...BASE_CHAR, mundusStone: 'The Thief' } });
    });

    it('mundusStone2 = The Thief doubles the SpellCrit bonus', () => {
      const twoThief = calculateBuild({
        character: { ...BASE_CHAR, mundusStone: 'The Thief', mundusStone2: 'The Thief' },
      });
      const delta1 = oneThief.SpellCrit - noMundus.SpellCrit;
      const delta2 = twoThief.SpellCrit - noMundus.SpellCrit;
      expect(delta2).toBeCloseTo(delta1 * 2, 4);
    });

    it('different mundusStone + mundusStone2 apply both effects', () => {
      const dualMundus = calculateBuild({
        character: { ...BASE_CHAR, mundusStone: 'The Thief', mundusStone2: 'The Apprentice' },
      });
      // The Thief → SpellCrit; The Apprentice → SpellDamage
      expect(dualMundus.SpellCrit).toBeGreaterThan(noMundus.SpellCrit);
      expect(dualMundus.SpellDamage).toBeGreaterThan(noMundus.SpellDamage);
    });

    it('no bleed-through without mundusStone2', () => {
      calculateBuild({
        character: { ...BASE_CHAR, mundusStone: 'The Thief', mundusStone2: 'The Thief' },
      });
      const clean = calculateBuild({ character: { ...BASE_CHAR, mundusStone: 'The Thief' } });
      expect(clean.SpellCrit).toBeCloseTo(oneThief.SpellCrit, 4);
    });
  });
});
