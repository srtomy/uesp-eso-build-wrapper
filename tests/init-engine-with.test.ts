import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initEsoEngineWith, resetEngine, calculateBuild } from '../src/lib/eso-engine';
import { loadInitData } from './helpers/load-init-data';

beforeAll(() => {
  resetEngine();
  initEsoEngineWith({ initData: loadInitData() });
});

afterAll(() => {
  resetEngine();
});

describe('initEsoEngineWith', () => {
  it('produz os mesmos stats baseline que initEsoEngine', () => {
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
    expect(() => initEsoEngineWith({ initData: loadInitData() })).not.toThrow();
  });
});
