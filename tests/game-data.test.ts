import { describe, expect, it } from 'vitest';
import { loadInitData } from '../src/lib/eso-engine/game-data';

describe('loadInitData', () => {
  it('loads the committed game data artifact', () => {
    const data = loadInitData();
    expect(Object.keys(data.computedStats).length).toBeGreaterThan(0);
    expect(data.buildRules).toBeDefined();
  });
});
