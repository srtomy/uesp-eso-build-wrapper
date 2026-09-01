import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

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
] as const;

const classes = [
  'Arcanist',
  'Dragonknight',
  'Necromancer',
  'Nightblade',
  'Sorcerer',
  'Templar',
  'Warden',
] as const;

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('calculateBuild properties', () => {
  it('returns finite non-negative resources for valid characters', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...races),
        fc.constantFrom(...classes),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 64 }),
        (race, className, level, magicka) => {
          const stats = calculateBuild({
            character: {
              race,
              class: className,
              level,
              attributes: { health: 0, magicka, stamina: 0 },
            },
          });

          for (const value of [stats.Health, stats.Magicka, stats.Stamina, stats.SpellDamage]) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          }
          expect(Object.keys(stats.raw).length).toBeGreaterThan(10);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('is stable when an empty items object is supplied', () => {
    fc.assert(
      fc.property(fc.constantFrom(...races), fc.constantFrom(...classes), (race, className) => {
        const character = {
          race,
          class: className,
          level: 50,
          attributes: { health: 0, magicka: 64, stamina: 0 },
        };
        expect(calculateBuild({ character }).raw).toEqual(
          calculateBuild({ character, items: {} }).raw,
        );
      }),
      { numRuns: 15 },
    );
  });
});
