import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initEsoEngineFromData, resetEngine, calculateBuild } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

beforeAll(() => {
  resetEngine();
  initEsoEngineFromData({ initData: loadInitData() });
});

afterAll(() => {
  resetEngine();
});

describe('initEsoEngineFromData', () => {
  it('produces the correct baseline stats', () => {
    const stats = calculateBuild({
      character: {
        race: 'High Elf',
        class: 'Sorcerer',
        level: 50,
        attributes: { health: 0, magicka: 64, stamina: 0 },
      },
    });
    expect(stats.Health).toBe(16000);
    expect(stats.Magicka).toBe(19104);
    expect(stats.Stamina).toBe(12000);
  });

  it('is idempotent — second call does not reinitialize', () => {
    expect(() => initEsoEngineFromData({ initData: loadInitData() })).not.toThrow();
  });
});
