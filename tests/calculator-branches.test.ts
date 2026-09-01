import { beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

const CHARACTER = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

const EMPTY_ITEM = {
  itemId: 'test-item',
  armorRating: '0',
  weaponPower: '0',
  armorType: '0',
  weaponType: '0',
  type: '2',
  equipType: '3',
};

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('calculateBuild input branches', () => {
  it('accepts items without optional set fields', () => {
    expect(() =>
      calculateBuild({ character: CHARACTER, items: { Chest: EMPTY_ITEM } }),
    ).not.toThrow();
    const item = (global as any).g_EsoBuildItemData.Chest;
    expect(item.setBonusCount1).toBe('-1');
    expect(item.setBonusDesc12).toBe('');
  });

  it('preserves explicitly supplied optional set fields', () => {
    const supplied = {
      ...EMPTY_ITEM,
      setBonusCount1: '2',
      setBonusDesc1: '(2 items) Adds 100 Health',
    };
    calculateBuild({ character: CHARACTER, items: { Chest: supplied } });

    expect((global as any).g_EsoBuildItemData.Chest).toMatchObject(supplied);
  });

  it('resolves named CP nodes and strips HTML and color codes', () => {
    calculateBuild({
      character: { ...CHARACTER, championPoints: 160 },
      championPointNodes: {
        'Arcane Supremacy': {
          points: 25,
          description: '<b>Bonus</b> |cffffffIncreases|r Max Magicka. Current bonus: 25',
        },
      },
    });

    const node = (global as any).g_EsoCpData['141744'];
    expect(node.name).toBe('Arcane Supremacy');
    expect(node.description).not.toMatch(/<[^>]+>|\|c|\|r/);
    expect(node.description).toContain('Current bonus: 25');
  });

  it('keeps numeric CP data when the same node is also named', () => {
    calculateBuild({
      character: { ...CHARACTER, championPoints: 160 },
      championPointNodes: {
        '141744': { description: 'Grants 1 Max Magicka per stage. Current bonus: 10' },
        'Arcane Supremacy': { description: 'Grants 1 Max Magicka per stage. Current bonus: 20' },
      },
    });

    expect((global as any).g_EsoCpData['141744'].description).toContain('Current bonus: 10');
    expect((global as any).g_EsoCpData.ArcaneSupremacy).toBeUndefined();
  });

  it('retains a CP node marked locked without applying it', () => {
    const base = calculateBuild({ character: { ...CHARACTER, championPoints: 160 } });
    const locked = calculateBuild({
      character: { ...CHARACTER, championPoints: 160 },
      championPointNodes: {
        '141744': { points: 50, isUnlocked: false },
      },
    });

    expect((global as any).g_EsoCpData['141744'].isUnlocked).toBe(false);
    expect(locked.Magicka).toBe(base.Magicka);
  });

  it('limits each skill bar to six slots and synchronizes the active bar', () => {
    calculateBuild({
      character: CHARACTER,
      activeWeaponBar: 2,
      skillBars: {
        bar1: Array.from({ length: 7 }, (_, i) => ({ skillId: 28000 + i })),
        bar2: [{ skillId: 29073, morphSkillId: 29074, morphIndex: 1 }],
      },
    });

    const bars = (global as any).g_EsoSkillBarData;
    expect(bars[0]).toHaveLength(6);
    expect(bars[0][5].skillId).toBe(28005);
    expect(bars[1][0]).toMatchObject({ skillId: 29073, morphIndex: 1 });
    expect((global as any).g_EsoBuildActiveWeapon).toBe(2);
    expect((global as any).g_EsoBuildActiveAbilityBar).toBe(2);
    expect((global as any).g_EsoSkillActiveData[29073].abilityId).toBe(29074);
  });
});
