import { describe, expect, it } from 'vitest';
import { loadInitData } from '../src/lib/eso-engine/game-data';
import type { UespInitData } from '../src/lib/eso-engine';

describe('loadInitData', () => {
  it('loads the full committed game data artifact', () => {
    const data = loadInitData();
    expect(Object.keys(data.computedStats)).toHaveLength(204);
    expect(data.buildRules).toBeDefined();
  });

  it('carries the provenance metadata', () => {
    const data = loadInitData() as UespInitData & { _meta?: Record<string, unknown> };
    expect(data._meta?.gameVersion).toBeDefined();
    expect(data._meta?.source).toBeDefined();
  });
});
