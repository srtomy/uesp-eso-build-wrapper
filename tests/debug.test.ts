import { beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, debugBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

const CHARACTER = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('debugBuild', () => {
  it('returns the same computed stats as calculateBuild', () => {
    const regular = calculateBuild({ character: CHARACTER });
    const debug = debugBuild({ character: CHARACTER });

    expect(debug.computedStats).toEqual(regular.raw);
    expect(debug.computedStats.Health).toBe(regular.Health);
    expect(debug.computedStats.Magicka).toBe(regular.Magicka);
  });

  it('captures non-zero input values by engine category', () => {
    const debug = debugBuild({
      character: { ...CHARACTER, mundusStone: 'The Apprentice' },
      activeBuffs: ['Major Prophecy'],
    });

    expect(Object.values(debug.inputValues.Mundus).some((value) => value !== 0)).toBe(true);
    expect(Object.values(debug.inputValues.Buff).some((value) => value !== 0)).toBe(true);
    expect(Object.values(debug.inputValues.SkillBonusSpellDmg).length).toBeGreaterThan(0);
    expect(debug.inputValues.Item).not.toHaveProperty('unused');
  });

  it('captures CP node state and stat sources', () => {
    const debug = debugBuild({
      character: { ...CHARACTER, championPoints: 160 },
      championPointNodes: { '141744': { points: 25 } },
    });

    expect(debug.cpNodes['141744']).toEqual({
      name: 'Arcane Supremacy',
      points: 25,
      isUnlocked: true,
    });
    expect(debug.computedStats.Magicka).toBe(19754);
    expect(debug.statSources).toEqual(expect.any(Object));
  });

  it('restores the GetEsoInputValues monkey-patch after a calculation error', () => {
    const globalObject = global as any;
    const originalGetInputValues = globalObject.GetEsoInputValues;
    const originalUpdate = globalObject.UpdateEsoComputedStatsList_Real;
    globalObject.UpdateEsoComputedStatsList_Real = () => {
      throw new Error('calculation failed');
    };

    try {
      expect(() => debugBuild({ character: CHARACTER })).toThrow('calculation failed');
      expect(globalObject.GetEsoInputValues).toBe(originalGetInputValues);
    } finally {
      globalObject.UpdateEsoComputedStatsList_Real = originalUpdate;
    }
  });

  it('does not install a patch when input capture is unavailable', () => {
    const globalObject = global as any;
    const originalGetInputValues = globalObject.GetEsoInputValues;
    globalObject.GetEsoInputValues = undefined;

    try {
      expect(() => debugBuild({ character: CHARACTER })).toThrow(
        'GetEsoInputValues is not a function',
      );
      expect(globalObject.GetEsoInputValues).toBeUndefined();
    } finally {
      globalObject.GetEsoInputValues = originalGetInputValues;
    }
  });
});
