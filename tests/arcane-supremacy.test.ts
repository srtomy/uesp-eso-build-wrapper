/**
 * Integration tests: CP nodes with real data from vendor/uesp-data/uesp-init-data.json.
 *
 * Each suite allocates points into a real node and asserts the stat delta matches
 * the "Current bonus" value in the node's description at that point level.
 *
 * The UESP engine flow:
 *   1. calculator.ts reads g_EsoCpSkillDesc[nodeId][points], strips HTML, stores in g_EsoCpData
 *   2. Engine replaces \n with space in the description
 *   3. Matches against the rule regex (e.g. /Current bonus: (\d+\.?\d*)/)
 *   4. Adds captured value to the stat
 */

import {beforeAll, describe, expect, it} from 'vitest';
import path from 'path';
import {calculateBuild, initEsoEngine} from '../src/lib/eso-engine';

const CHAR_BASE = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: {health: 0, magicka: 64, stamina: 0},
} as const;

const CHAR_CP160 = { ...CHAR_BASE, championPoints: 160 };

// Baselines established by engine.test.ts golden regression
const BASELINE_MAGICKA = 19104;
const BASELINE_STAMINA = 12000;
const BASELINE_HEALTH = 16000;

beforeAll(() => {
  initEsoEngine(
      path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
      path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
  );
});

// ── Arcane Supremacy (141744) — Max Magicka ──────────────────────────────────

describe('Arcane Supremacy CP node — real data integration', () => {
  const NODE_ID = '141744';

  describe('50 points (max) — +1300 Max Magicka', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 50}},
      });
    });

    it('Magicka = baseline + 1300 (50 × 26)', () => {
      expect(stats.Magicka).toBe(BASELINE_MAGICKA + 1300); // 20404
    });

    it('g_EsoCpData entry has plain-text description (no HTML tags)', () => {
      const cpData: any = (global as any).g_EsoCpData;
      const desc: string = cpData?.[NODE_ID]?.description ?? '';
      expect(desc).not.toMatch(/<[^>]+>/);
      expect(desc).toMatch(/Increases Max Magicka by 26 per stage/i);
      expect(desc).toMatch(/Current bonus:\s*1300/i);
    });

    it('g_EsoCpData entry has name "Arcane Supremacy"', () => {
      const cpData: any = (global as any).g_EsoCpData;
      expect(cpData?.[NODE_ID]?.name).toBe('Arcane Supremacy');
    });

    it('g_EsoCpData entry is marked isUnlocked = true', () => {
      const cpData: any = (global as any).g_EsoCpData;
      expect(cpData?.[NODE_ID]?.isUnlocked).toBe(true);
    });
  });

  describe('25 points (half) — +650 Max Magicka', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 25}},
      });
    });

    it('Magicka = baseline + 650 (25 × 26)', () => {
      expect(stats.Magicka).toBe(BASELINE_MAGICKA + 650); // 19754
    });

    it('g_EsoCpData entry description shows Current bonus: 650', () => {
      const cpData: any = (global as any).g_EsoCpData;
      const desc: string = cpData?.[NODE_ID]?.description ?? '';
      expect(desc).toMatch(/Current bonus:\s*650/i);
    });
  });

  describe('0 points — no Magicka bonus', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 0}},
      });
    });

    it('Magicka = baseline (no bonus at 0 points)', () => {
      expect(stats.Magicka).toBe(BASELINE_MAGICKA);
    });
  });
});

// ── Endless Endurance (141773) — Max Stamina ─────────────────────────────────

describe('Endless Endurance CP node — real data integration', () => {
  const NODE_ID = '141773';

  describe('50 points (max) — +1300 Max Stamina', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 50}},
      });
    });

    it('Stamina = baseline + 1300 (50 × 26)', () => {
      expect(stats.Stamina).toBe(BASELINE_STAMINA + 1300); // 13300
    });

    it('g_EsoCpData entry has plain-text description (no HTML tags)', () => {
      const cpData: any = (global as any).g_EsoCpData;
      const desc: string = cpData?.[NODE_ID]?.description ?? '';
      expect(desc).not.toMatch(/<[^>]+>/);
      expect(desc).toMatch(/Current bonus:\s*1300/i);
    });

    it('g_EsoCpData entry has name "Endless Endurance"', () => {
      const cpData: any = (global as any).g_EsoCpData;
      expect(cpData?.[NODE_ID]?.name).toBe('Endless Endurance');
    });
  });

  describe('0 points — no Stamina bonus', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 0}},
      });
    });

    it('Stamina = baseline (no bonus at 0 points)', () => {
      expect(stats.Stamina).toBe(BASELINE_STAMINA);
    });
  });
});

// ── Boundless Vitality (142034) — Max Health ─────────────────────────────────

describe('Boundless Vitality CP node — real data integration', () => {
  const NODE_ID = '142034';

  describe('50 points (max) — +1400 Max Health', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 50}},
      });
    });

    it('Health = baseline + 1400 (50 × 28)', () => {
      expect(stats.Health).toBe(BASELINE_HEALTH + 1400); // 17400
    });

    it('g_EsoCpData entry has plain-text description (no HTML tags)', () => {
      const cpData: any = (global as any).g_EsoCpData;
      const desc: string = cpData?.[NODE_ID]?.description ?? '';
      expect(desc).not.toMatch(/<[^>]+>/);
      expect(desc).toMatch(/Current bonus:\s*1400/i);
    });

    it('g_EsoCpData entry has name "Boundless Vitality"', () => {
      const cpData: any = (global as any).g_EsoCpData;
      expect(cpData?.[NODE_ID]?.name).toBe('Boundless Vitality');
    });
  });

  describe('0 points — no Health bonus', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 0}},
      });
    });

    it('Health = baseline (no bonus at 0 points)', () => {
      expect(stats.Health).toBe(BASELINE_HEALTH);
    });
  });
});

// ── Fortified (142035) — Armor (PhysicalResist + SpellResist) ────────────────

describe('Fortified CP node — real data integration', () => {
  const NODE_ID = '142035';

  describe('50 points (max) — +1731 Armor', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 50}},
      });
    });

    it('PhysicalResist = 0 + 1731', () => {
      expect(stats.PhysicalResist).toBe(1731);
    });

    it('SpellResist = 0 + 1731', () => {
      expect(stats.SpellResist).toBe(1731);
    });

    it('g_EsoCpData entry has plain-text description (no HTML tags)', () => {
      const cpData: any = (global as any).g_EsoCpData;
      const desc: string = cpData?.[NODE_ID]?.description ?? '';
      expect(desc).not.toMatch(/<[^>]+>/);
      expect(desc).toMatch(/Current bonus:\s*1731/i);
    });

    it('g_EsoCpData entry has name "Fortified"', () => {
      const cpData: any = (global as any).g_EsoCpData;
      expect(cpData?.[NODE_ID]?.name).toBe('Fortified');
    });
  });

  describe('0 points — no Armor bonus', () => {
    let stats: ReturnType<typeof calculateBuild>;

    beforeAll(() => {
      stats = calculateBuild({
        character: CHAR_CP160,
        championPointNodes: {[NODE_ID]: {points: 0}},
      });
    });

    it('PhysicalResist = 0 (no bonus at 0 points)', () => {
      expect(stats.PhysicalResist).toBe(0);
    });
  });
});
