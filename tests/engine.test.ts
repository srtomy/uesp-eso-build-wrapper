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

import {beforeAll, describe, expect, it} from 'vitest';
import path from 'path';
import type {UespItemApiData} from '../src/lib/eso-engine';
import {calculateBuild, initEsoEngine} from '../src/lib/eso-engine';

// ── Engine setup ──────────────────────────────────────────────────────────────

beforeAll(() => {
    initEsoEngine(
        path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
        path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
    );
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
    setBonusDesc2: '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
    setBonusDesc3: '(4 items) Adds 112 Weapon and Spell Damage',
    setBonusDesc4: '(5 items) When you deal damage with a Light Attack, you apply Whorl of the Depths to the target, dealing 1016 Frost damage over |cffffff8|r seconds.',
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
    setBonusDesc2: '(3 items) Gain Minor Slayer at all times, increasing your damage done to Dungeon, Trial, and Arena Monsters by 5%.',
    setBonusDesc3: '(4 items) Adds 1487 Offensive Penetration',
    setBonusDesc4: "(5 items) Increases your damage done against monsters by 7%. When you interrupt an enemy, you increase your damage done against monsters by an additional 7% for |cffffff10|r seconds.",
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

/** Fabricated heavy chest with a health enchant — used for tank scenario. */
const HEAVY_CHEST_WITH_HEALTH_ENCHANT: UespItemApiData = {
    itemId: '999',
    armorRating: '2460',
    weaponPower: '0',
    armorType: '3',  // 3 = Heavy
    weaponType: '0',
    traitDesc: '',
    enchantDesc: 'Adds 1487 Maximum Health.',
    internalLevel: '1',
    internalSubtype: '0',
};

// ── Shared character presets ──────────────────────────────────────────────────

const HIGH_ELF_SORC_64MAG = {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: {health: 0, magicka: 64, stamina: 0},
} as const;

const NORD_DK_64HEA = {
    race: 'Nord',
    class: 'Dragonknight',
    level: 50,
    attributes: {health: 64, magicka: 0, stamina: 0},
} as const;

// ── Test suites ───────────────────────────────────────────────────────────────

describe('calculateBuild', () => {

    // ── 1. Baseline stats (golden regression) ───────────────────────────────────
    describe('baseline — High Elf Sorcerer lv50, 64 Magicka pts, no items', () => {
        let stats: ReturnType<typeof calculateBuild>;

        beforeAll(() => {
            stats = calculateBuild({character: HIGH_ELF_SORC_64MAG});
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
            basePhysicalResist = calculateBuild({character: HIGH_ELF_SORC_64MAG}).raw['PhysicalResist'] ?? 0;
            const withItem = calculateBuild({
                character: HIGH_ELF_SORC_64MAG,
                items: {Chest: JERKIN_OF_THE_DEPTHS},
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
            const a1 = calculateBuild({character: HIGH_ELF_SORC_64MAG});

            // Different character
            calculateBuild({character: NORD_DK_64HEA});

            // Back to the first character — no bleed-through
            const a2 = calculateBuild({character: HIGH_ELF_SORC_64MAG});

            expect(a2.Health).toBe(a1.Health);
            expect(a2.Magicka).toBe(a1.Magicka);
            expect(a2.Stamina).toBe(a1.Stamina);
        });

        it('items from a previous call do not carry over to the next call', () => {
            // Call WITH a Magicka chest item
            calculateBuild({
                character: HIGH_ELF_SORC_64MAG,
                items: {Chest: JERKIN_OF_THE_DEPTHS},
            });

            // Call WITHOUT items — Magicka must be the no-item baseline
            const clean = calculateBuild({character: HIGH_ELF_SORC_64MAG});
            expect(clean.Magicka).toBe(19104);
        });
    });

    // ── 4. Nord DK tank (golden regression) ─────────────────────────────────────
    describe('Nord Dragonknight tank — lv50, 64 Health pts, no items', () => {
        it('Health = 23808  [formula: (300×50 + 1000 + 122×64) with Nord bonus]', () => {
            const stats = calculateBuild({character: NORD_DK_64HEA});
            expect(stats.Health).toBe(23808);
        });
    });

    // ── 5. Guard rails ───────────────────────────────────────────────────────────
    describe('guard rails', () => {
        it('level above 50 is clamped to 50 (same Health as an explicit lv50)', () => {
            const lv50 = calculateBuild({character: HIGH_ELF_SORC_64MAG}).Health;
            const lv99 = calculateBuild({
                character: {...HIGH_ELF_SORC_64MAG, level: 99},
            }).Health;
            expect(lv99).toBe(lv50);
        });

        it('initEsoEngine() called a second time is a safe no-op', () => {
            expect(() => {
                initEsoEngine(
                    path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
                    path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
                );
            }).not.toThrow();
        });
    });

    // ── 6. Return value shape ────────────────────────────────────────────────────
    describe('ComputedStats return shape', () => {
        let stats: ReturnType<typeof calculateBuild>;

        beforeAll(() => {
            stats = calculateBuild({character: HIGH_ELF_SORC_64MAG});
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

describe('calculateBuild with itens', () => {
    describe('baseline — High Elf Sorcerer lv50, 64 Magicka pts', () => {
        let stats: ReturnType<typeof calculateBuild>;

        beforeAll(() => {
            stats = calculateBuild({
                character: HIGH_ELF_SORC_64MAG,
                items: {Chest: JERKIN_OF_THE_DEPTHS, Head: ANSUULS_HELMET}
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

    });
})
