import { beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

// Locks the one-hand weapon ×0.5 enchant factor (card #124).
//
// The factor does NOT apply to weaponPower — a lone 1H weapon contributes its
// full power to WeaponDamage. It applies to the weapon *enchant*, in
// GetEsoInputItemEnchantWeaponValues (esoEditBuild.js:2884-2887) and
// GetEsoInputItemEnchantOtherHandWeaponValues (:2990-2993):
//   if (!enchantData.isDefaultEnchant && weaponType in {1,2,3,11}) enchantFactor *= 0.5
//
// Weapon enchants never feed Item.* sheet stats (all 16 weaponenchant rules
// have OtherEffects/empty effects), so the sheet cannot expose the factor.
// The observable is the rewritten enchant text (ReplaceEsoWeaponMatch does
// floor(value * enchantFactor)), stored on g_EsoBuildEnchantData[slot].newEnchantDesc.

const CHARACTER = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  championPoints: 160,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

// weaponType 1 = 1H axe, 4 = 2H sword. trait 0 keeps the factor clean (no Infused).
const ONE_HAND_AXE = {
  itemId: 'test-1h-axe',
  weaponPower: '1335',
  weaponType: '1',
  type: '1',
  trait: '0',
  traitDesc: '',
};

const TWO_HAND_SWORD = {
  itemId: 'test-2h-sword',
  weaponPower: '1335',
  weaponType: '4',
  type: '1',
  trait: '0',
  traitDesc: '',
};

// Matches weaponenchant rule 41174 (/Deals ([0-9]+) flame damage/i).
const FLAME_ENCHANT = 'Deals 1948 Flame Damage.';

function newEnchantDesc(slot: string): string {
  return (global as any).g_EsoBuildEnchantData[slot]?.newEnchantDesc ?? '';
}

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('one-hand weapon enchant ×0.5 factor', () => {
  it('halves a weapon enchant on a 1H main hand (floor(1948 * 0.5) = 974)', () => {
    calculateBuild({
      character: CHARACTER,
      items: { MainHand1: ONE_HAND_AXE },
      enchantOverrides: { MainHand1: { enchantDesc: FLAME_ENCHANT } },
    });

    expect(newEnchantDesc('MainHand1')).toBe('Deals 974 Flame Damage.');
  });

  it('leaves a weapon enchant intact on a 2H main hand', () => {
    calculateBuild({
      character: CHARACTER,
      items: { MainHand1: TWO_HAND_SWORD },
      enchantOverrides: { MainHand1: { enchantDesc: FLAME_ENCHANT } },
    });

    expect(newEnchantDesc('MainHand1')).toBe('Deals 1948 Flame Damage.');
  });

  it('halves a weapon enchant on a 1H off hand', () => {
    calculateBuild({
      character: CHARACTER,
      items: {
        MainHand1: TWO_HAND_SWORD,
        OffHand1: { ...ONE_HAND_AXE, itemId: 'test-1h-offhand' },
      },
      enchantOverrides: { OffHand1: { enchantDesc: FLAME_ENCHANT } },
    });

    expect(newEnchantDesc('OffHand1')).toBe('Deals 974 Flame Damage.');
  });

  it('weaponPower still enters full on a lone 1H weapon (factor is enchant-only)', () => {
    const stats = calculateBuild({
      character: CHARACTER,
      items: { MainHand1: ONE_HAND_AXE },
    });

    // base 1000 + full 1335, no halving
    expect(stats.WeaponDamage).toBe(2335);
  });
});
