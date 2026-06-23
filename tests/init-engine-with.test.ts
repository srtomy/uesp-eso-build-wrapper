import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initEsoEngineFromData, resetEngine, calculateBuild } from '../src/lib/eso-engine';
import { loadInitData } from './helpers/load-init-data';

beforeAll(() => {
  resetEngine();
  initEsoEngineFromData({ initData: loadInitData() });
});

afterAll(() => {
  resetEngine();
});

describe('initEsoEngineFromData', () => {
  it('produz os stats baseline corretos', () => {
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

  it('é idempotente — segunda chamada não reinicializa', () => {
    expect(() => initEsoEngineFromData({ initData: loadInitData() })).not.toThrow();
  });
});
