/**
 * Toggle skills with `maxTimes` — stack count (D1).
 *
 * The engine multiplies a toggle's effect by `toggleData.count`
 * (esoEditBuild.js:14657) and discards it when the result is 0 (:14714).
 * The wrapper previously never wrote `count`, so every maxTimes toggle
 * without `useCountForRegexVar` was silently discarded.
 *
 * `BuildInput.toggleSkills` now accepts `{ name, count }` in addition to the
 * plain name string, and `count` is clamped to the toggle's `maxTimes`
 * (matching the UESP UI, OnEsoBuildToggleSkillNumber at :8104).
 *
 * Toggles used here:
 *   Blood Frenzy (active, baseSkillId 40132141, maxTimes 5)
 *     "increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times"
 *     → +60 Weapon/Spell Damage per stack.
 *   Emperor (passive, baseSkillId 39641, maxTimes 6, useCountForRegexVar: 1)
 *     `count` selects the description's keep tier, not a multiplier:
 *     count 0/1 → 1 keep (38%), count 6 → 6 keeps (75%).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

const CHAR = {
  race: 'High Elf' as const,
  class: 'Sorcerer' as const,
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
};

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('toggleSkills count — maxTimes toggles apply stacks (D1)', () => {
  let base: ReturnType<typeof calculateBuild>;

  beforeAll(() => {
    base = calculateBuild({ character: CHAR });
  });

  it('count 0 (plain name) discards the effect', () => {
    const withToggle = calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 40132141 }] },
      toggleSkills: ['Blood Frenzy'],
    });
    expect(withToggle.WeaponDamage).toBe(base.WeaponDamage);
    expect(withToggle.SpellDamage).toBe(base.SpellDamage);
  });

  it('count 1 adds one stack (+60 Weapon and Spell Damage)', () => {
    const withToggle = calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 40132141 }] },
      toggleSkills: [{ name: 'Blood Frenzy', count: 1 }],
    });
    expect(withToggle.WeaponDamage - base.WeaponDamage).toBe(60);
    expect(withToggle.SpellDamage - base.SpellDamage).toBe(60);
  });

  it('count 5 adds five stacks (+300 Weapon and Spell Damage)', () => {
    const withToggle = calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 40132141 }] },
      toggleSkills: [{ name: 'Blood Frenzy', count: 5 }],
    });
    expect(withToggle.WeaponDamage - base.WeaponDamage).toBe(300);
    expect(withToggle.SpellDamage - base.SpellDamage).toBe(300);
  });

  it('count above maxTimes is clamped to maxTimes', () => {
    const withToggle = calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 40132141 }] },
      toggleSkills: [{ name: 'Blood Frenzy', count: 999 }],
    });
    expect(withToggle.WeaponDamage - base.WeaponDamage).toBe(300);
  });

  it('count resets between calls  [no bleed-through]', () => {
    calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 40132141 }] },
      toggleSkills: [{ name: 'Blood Frenzy', count: 5 }],
    });
    const clean = calculateBuild({
      character: CHAR,
      skillBars: { bar1: [{ skillId: 40132141 }] },
      toggleSkills: [{ name: 'Blood Frenzy' }],
    });
    expect(clean.WeaponDamage).toBe(base.WeaponDamage);
  });
});

describe('toggleSkills count — useCountForRegexVar toggles select the tier', () => {
  const cyrodiil = { ...CHAR, cyrodiil: true };
  let baseMagicka: number;

  beforeAll(() => {
    baseMagicka = calculateBuild({ character: CHAR }).Magicka;
  });

  it('count 0/1 keeps the minimum tier (1 keep = 38% Magicka)', () => {
    for (const count of [0, 1]) {
      const withEmperor = calculateBuild({
        character: cyrodiil,
        passiveSkills: [39641],
        toggleSkills: [{ name: 'Emperor', count }],
      });
      // baseMagicka (19104) × 0.38 = 7259
      expect(withEmperor.Magicka - baseMagicka).toBe(7259);
    }
  });

  it('count 6 selects the top tier (6 keeps = 75% Magicka)', () => {
    const withEmperor = calculateBuild({
      character: cyrodiil,
      passiveSkills: [39641],
      toggleSkills: [{ name: 'Emperor', count: 6 }],
    });
    // baseMagicka (19104) × 0.75 = 14328
    expect(withEmperor.Magicka - baseMagicka).toBe(14328);
  });

  it('count above maxTimes is clamped to maxTimes', () => {
    const withEmperor = calculateBuild({
      character: cyrodiil,
      passiveSkills: [39641],
      toggleSkills: [{ name: 'Emperor', count: 999 }],
    });
    expect(withEmperor.Magicka - baseMagicka).toBe(14328);
  });
});

describe('toggleSkills count — toggles without maxTimes ignore the count', () => {
  it('Aegis of the Unseen still applies its flat resist with a count', () => {
    const withAegis = calculateBuild({
      character: CHAR,
      passiveSkills: [184918],
      toggleSkills: [{ name: 'Aegis of the Unseen', count: 7 }],
    });
    expect(withAegis.PhysicalResist).toBe(1636);
    expect(withAegis.SpellResist).toBe(1636);
  });
});

describe('toggleSkills count — unknown toggle names are tolerated', () => {
  it('does not throw and applies no effect', () => {
    const base = calculateBuild({ character: CHAR });
    const withUnknown = calculateBuild({
      character: CHAR,
      toggleSkills: [{ name: 'Not A Real Toggle', count: 3 }],
    });
    expect(withUnknown.Magicka).toBe(base.Magicka);
    expect(withUnknown.SpellDamage).toBe(base.SpellDamage);
  });
});
