/**
 * Tests for the dynamic resolution of CP2 node names and descriptions.
 *
 * Context: calculator.ts populates g_EsoCpData[nodeId] using the globals
 * g_EsoCpSkills (names) and g_EsoCpSkillDesc (descriptions per point level).
 * These globals are injected by loader.ts from cpSkillsData and
 * cpSkillDescData in uesp-init-data.json (extracted from the browser).
 *
 * The tests use mocked globals to stay independent of the extracted JSON.
 * The UESP engine behavior (stat calculation) is not tested here —
 * only the data-provisioning logic feeding the engine.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

// ── Setup ─────────────────────────────────────────────────────────────────────

let originalCpSkills: unknown;
let originalCpSkillDesc: unknown;

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
  // Save real JSON-loaded globals so clearMockCpGlobals can restore them
  // instead of replacing with empty objects (which would break other test files
  // that rely on the real data when tests run in different orders).
  originalCpSkills = (global as any).g_EsoCpSkills;
  originalCpSkillDesc = (global as any).g_EsoCpSkillDesc;
});

// Mocked data simulating what the browser extracts after re-running
// browser-extract.js (g_EsoCpSkills and g_EsoCpSkillDesc injected by the loader).
const MOCK_CP_SKILLS = {
  '60494': { name: 'Inspiration Boost', disciplineIndex: 0 },
  '60500': { name: 'Gifted Rider', disciplineIndex: 1 },
};

const MOCK_CP_SKILL_DESC: Record<string, Record<string | number, string>> = {
  '60494': {
    0: 'Base description.',
    5: 'Desc at 5 pts.',
    10: 'Desc at 10 pts.',
  },
  '60500': {
    0: 'Rider base description.',
    20: 'Rider at 20 pts.',
  },
};

// Minimal character to run calculateBuild without interfering with the CP tests.
const BASE_CHAR = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

/** Injects the mocked globals and returns the restore function. */
function injectMockCpGlobals() {
  (global as any).g_EsoCpSkills = MOCK_CP_SKILLS;
  (global as any).g_EsoCpSkillDesc = MOCK_CP_SKILL_DESC;
}

/** Restores the globals to the real values loaded from the JSON. */
function clearMockCpGlobals() {
  (global as any).g_EsoCpSkills = originalCpSkills;
  (global as any).g_EsoCpSkillDesc = originalCpSkillDesc;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CP node injection — name resolution', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  it('g_EsoCpData is empty after calculateBuild (automatic reset confirmed)', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 5 } },
    });
    // Call again without nodes — the previous result must not persist
    calculateBuild({ character: BASE_CHAR });
    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {})).toHaveLength(0);
  });
});

describe('CP node injection — description resolution', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  /**
   * Captures g_EsoCpData right after calculateBuild injects the nodes but before
   * the engine resets. We use an instrumented version via a spy on the global object.
   *
   * Strategy: after calculateBuild, the engine called UpdateEsoComputedStatsList_Real
   * which resets g_EsoCpData internally. To capture the state during injection,
   * we read g_EsoCpData before calling calculateBuild and compare it with the snapshot
   * that calculateBuild records when calling the engine.
   *
   * Since we have no access to an internal hook, we test the observable behavior:
   * we re-inject the mocks, call calculateBuild with nodes, and check that
   * g_EsoCpData IS populated IMMEDIATELY on return (before any other code
   * clears it — the reset only happens at the START of the NEXT call).
   */
  function captureNodeAfterCall(nodeId: string, points?: number, description?: string): any {
    injectMockCpGlobals();
    const nodeData: any = {};
    if (points !== undefined) nodeData.points = points;
    if (description !== undefined) nodeData.description = description;

    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { [nodeId]: nodeData },
    });

    // g_EsoCpData is reset at the START of the next call, not at the end of this one.
    // So it is still populated immediately after the return.
    return (global as any).g_EsoCpData?.[nodeId];
  }

  // Description lookup by points: exact, floor (7→5, 3→0) and fallback
  // (no points) — same body, parameterized.
  it.each([
    {
      title: 'exact match: points=10 and key 10 exists',
      points: 10,
      expected: 'Desc at 10 pts.',
    },
    {
      title: 'floor lookup: points=7 (only 0,5,10 exist) → uses key 5',
      points: 7,
      expected: 'Desc at 5 pts.',
    },
    {
      title: 'floor lookup: points=3 (only 0,5,10 exist) → uses key 0',
      points: 3,
      expected: 'Base description.',
    },
    {
      title: 'no points given → fallback to key 0',
      points: undefined,
      expected: 'Base description.',
    },
  ])('$title → uses "$expected"', ({ points, expected }) => {
    const node = captureNodeAfterCall('60494', points);
    expect(node).toBeDefined();
    expect(node.description).toBe(expected);
  });

  it('explicit description → override ignores g_EsoCpSkillDesc', () => {
    const override = 'Grants 1 Max Magicka per stage. Current bonus: 1000';
    const node = captureNodeAfterCall('60494', 5, override);
    expect(node).toBeDefined();
    expect(node.description).toBe(override);
  });

  it('HTML in JSON descriptions is stripped before reaching the engine', () => {
    // Simulates the real cpSkillDescData format (with HTML as in browser-extract)
    (global as any).g_EsoCpSkills = { '60494': { name: 'Inspiration Boost', disciplineIndex: 0 } };
    (global as any).g_EsoCpSkillDesc = {
      '60494': {
        0: "Some <b>bold</b> text.\nCurrent bonus: <div class='esovcpDescWhite'>42</div>",
      },
    };
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 0 } },
    });
    const node = (global as any).g_EsoCpData?.['60494'];
    expect(node).toBeDefined();
    expect(node.description).not.toMatch(/<[^>]+>/);
    expect(node.description).toContain('42');
  });

  it('points above the highest available key → floor lookup uses the largest key', () => {
    // mock has keys 0, 5, 10 — points=999 must return key 10
    const node = captureNodeAfterCall('60494', 999);
    expect(node).toBeDefined();
    expect(node.description).toBe('Desc at 10 pts.');
  });
});

describe('CP node injection — real name vs fallback', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  it('node in g_EsoCpSkills → name = real name ("Inspiration Boost")', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 10 } },
    });
    const node = (global as any).g_EsoCpData?.['60494'];
    expect(node?.name).toBe('Inspiration Boost');
  });

  it('node MISSING from g_EsoCpSkills → name = "CP_<nodeId>"', () => {
    injectMockCpGlobals();
    // Node '99999' does not exist in the mocks, but has a description via override
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: {
        '99999': { description: 'Grants 1 Max Health per stage. Current bonus: 100' },
      },
    });
    const node = (global as any).g_EsoCpData?.['99999'];
    expect(node?.name).toBe('CP_99999');
  });
});

describe('CP node injection — g_EsoCpData structure', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  it('injected node has isUnlocked=true and type="skill"', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 10 } },
    });
    const node = (global as any).g_EsoCpData?.['60494'];
    expect(node?.isUnlocked).toBe(true);
    expect(node?.type).toBe('skill');
  });

  it('node without a resolvable description is NOT injected into g_EsoCpData', () => {
    // empty g_EsoCpSkillDesc + no description + no points → does not inject
    (global as any).g_EsoCpSkills = { '77777': { name: 'Unknown Node' } };
    (global as any).g_EsoCpSkillDesc = {};

    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '77777': {} },
    });
    const node = (global as any).g_EsoCpData?.['77777'];
    expect(node).toBeUndefined();
  });
});

describe('CP node injection — isolation between calls', () => {
  afterEach(clearMockCpGlobals);

  it('g_EsoCpData is reset: nodes from the previous call do not persist', () => {
    injectMockCpGlobals();
    // Call A: with CP node
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 10 } },
    });

    injectMockCpGlobals();
    // Call B: without CP nodes → g_EsoCpData must be empty
    calculateBuild({ character: BASE_CHAR });

    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {})).toHaveLength(0);
  });

  it('empty championPointNodes → g_EsoCpData stays empty', () => {
    injectMockCpGlobals();
    calculateBuild({ character: BASE_CHAR, championPointNodes: {} });
    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {})).toHaveLength(0);
  });

  it('two distinct nodes in the same call are both injected', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: {
        '60494': { points: 50 },
        '60500': { points: 20 },
      },
    });
    const cpData = (global as any).g_EsoCpData;
    expect(cpData?.['60494']).toBeDefined();
    expect(cpData?.['60494']?.name).toBe('Inspiration Boost');
    expect(cpData?.['60500']).toBeDefined();
    expect(cpData?.['60500']?.name).toBe('Gifted Rider');
    expect(cpData?.['60500']?.description).toBe('Rider at 20 pts.');
  });
});
