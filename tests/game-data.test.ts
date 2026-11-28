import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

  it('fails with an actionable message when the artifact is missing', () => {
    expect(() => loadInitData('/nonexistent/uesp-game-data.json')).toThrow(
      /Game data artifact not found/,
    );
  });

  it('fails with an actionable message when the artifact is not valid JSON', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uesp-game-data-'));
    const file = path.join(dir, 'broken.json');
    fs.writeFileSync(file, '{broken');
    try {
      expect(() => loadInitData(file)).toThrow(/not valid JSON/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
