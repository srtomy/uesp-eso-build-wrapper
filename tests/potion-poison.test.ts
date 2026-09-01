import { beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

const character = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

const potion = {
  itemId: '23290',
  type: '3',
  abilityDesc: 'Restore 7582 Health immediately.',
};

const poison = {
  itemId: '79693',
  type: '7',
  abilityDesc: 'Deals 4000 Poison Damage.',
};

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('Potion and poison slots', () => {
  it('accepts a potion item and preserves its API payload', () => {
    expect(() => calculateBuild({ character, items: { Potion: potion } })).not.toThrow();
    expect((global as any).g_EsoBuildItemData.Potion).toMatchObject(potion);
  });

  it('accepts both poison slots independently', () => {
    calculateBuild({
      character,
      items: { Poison1: poison, Poison2: { ...poison, itemId: '79694' } },
    });
    expect((global as any).g_EsoBuildItemData.Poison1.itemId).toBe('79693');
    expect((global as any).g_EsoBuildItemData.Poison2.itemId).toBe('79694');
  });

  it('does not retain potion or poison data in the next build', () => {
    calculateBuild({ character, items: { Potion: potion, Poison1: poison } });
    calculateBuild({ character });

    expect((global as any).g_EsoBuildItemData.Potion).toEqual({});
    expect((global as any).g_EsoBuildItemData.Poison1).toEqual({});
  });
});
