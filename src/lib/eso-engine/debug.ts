import { calculateBuild } from './calculator.js';
import { engineGlobals } from './engine-globals.js';
import type { EngineInputValues } from './engine-globals.js';
import type { BuildInput, ComputedStats } from './types.js';

// ---------------------------------------------------------------------------
// Debug types — they live here (not in types.ts) because they are internal to
// the diagnostic tool, not part of the lib's main surface.
// ---------------------------------------------------------------------------

/** One contribution to an input stat: which source (passive, CP, buff, set...) set it. */
export interface BuildDebugStatSource {
  name: string;
  abilityId?: number | string;
  value: number | string;
}

/** State of a single Champion Point node during the calculation. */
export interface BuildDebugCpNode {
  name: string;
  points: number;
  isUnlocked: boolean;
}

/** Per-category input values captured during the calculation (non-zero only). */
export interface BuildDebugInputValues {
  Skill2: Record<string, number>;
  CP: Record<string, number>;
  Buff: Record<string, number>;
  Skill: Record<string, number>;
  Item: Record<string, number>;
  Set: Record<string, number>;
  Mundus: Record<string, number>;
  Food: Record<string, number>;
  SkillBonusSpellDmg: Record<string, number>;
  SkillBonusWeaponDmg: Record<string, number>;
  SkillLineSpellDmg: Record<string, number>;
  SkillLineWeaponDmg: Record<string, number>;
}

export interface BuildDebugInfo {
  /** All computed stats (same as raw in ComputedStats). */
  computedStats: Record<string, number>;
  /** Input values by category, filtered to non-zero (except SkillBonus/SkillLine). */
  inputValues: BuildDebugInputValues;
  /** CP node state: which were active (isUnlocked) and with how many points. */
  cpNodes: Record<string, BuildDebugCpNode>;
  /**
   * Sources of each input stat: recorded by the engine during GetEsoInputValues.
   * Useful for tracing where an unexpected value comes from (e.g. which passive set SkillBonusSpellDmg.Flame).
   */
  statSources: Record<string, BuildDebugStatSource[]>;
}

function pickNonZero(obj: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && v !== 0) out[k] = v;
  }
  return out;
}

/**
 * Runs calculateBuild and returns detailed diagnostic information about the engine state.
 * Useful for debugging discrepancies between expected and computed stats.
 *
 * Captures:
 * - `computedStats`: all computed stat values (same as `result.raw`)
 * - `inputValues`: per-category input values used during computation (non-zero only,
 *   except SkillBonus/SkillLine which are always included for easier inspection)
 * - `cpNodes`: CP node state (name, points, isUnlocked)
 * - `statSources`: per-stat source log — which passive/CP/buff set each value;
 *   useful for tracing where an unexpected value comes from
 *
 * Why the monkey-patch on GetEsoInputValues:
 * Calling GetEsoInputValues() a second time after calculateBuild() gives incorrect
 * results because g_EsoComputedStats already holds the first round's values, and some
 * passive rules read them indirectly. The patch captures the exact inputValues used
 * in the calculation, without re-running it.
 *
 * Must be called after initEsoEngineFromData().
 */
export function debugBuild(input: BuildInput): BuildDebugInfo {
  const g = engineGlobals();

  let capturedIv: EngineInputValues | null = null;
  const origGetInputValues = g.GetEsoInputValues;

  if (typeof origGetInputValues === 'function') {
    g.GetEsoInputValues = function (mergeComputedStats: unknown) {
      const iv = origGetInputValues.call(this, mergeComputedStats);
      capturedIv = iv;
      return iv;
    };
  }

  let stats: ComputedStats;
  try {
    stats = calculateBuild(input);
  } finally {
    if (typeof origGetInputValues === 'function') g.GetEsoInputValues = origGetInputValues;
  }

  const iv: EngineInputValues = capturedIv ?? {};

  // CP node states — read g_EsoCpData which is still populated from calculateBuild
  const cpNodes: Record<string, BuildDebugCpNode> = {};
  const cpDataGlobal = g.g_EsoCpData ?? {};
  const cpSkills = g.g_EsoCpSkills ?? {};
  for (const [nodeId, cpData] of Object.entries(cpDataGlobal)) {
    if (!cpData || cpData.type !== 'skill') continue;
    // g_EsoCpData does not store points — read from the original input
    const inputNode = input.championPointNodes?.[nodeId];
    cpNodes[nodeId] = {
      name: cpData.name ?? cpSkills[nodeId]?.name ?? `CP_${nodeId}`,
      points: Number(inputNode?.points ?? 0),
      isUnlocked: cpData.isUnlocked === true,
    };
  }

  // Stat sources — populated by the engine in AddEsoInputStatSource during GetEsoInputValues
  const statSources: Record<string, BuildDebugStatSource[]> = {};
  const rawSources = g.g_EsoInputStatSources ?? {};
  for (const [statId, sources] of Object.entries(rawSources)) {
    statSources[statId] = sources.map((s) => ({
      name: s.cp ?? s.passive ?? s.buff ?? s.source ?? 'unknown',
      abilityId: s.abilityId,
      value: s.value,
    }));
  }

  return {
    computedStats: stats.raw,
    inputValues: {
      Skill2: pickNonZero(iv.Skill2 ?? {}),
      CP: pickNonZero(iv.CP ?? {}),
      Buff: pickNonZero(iv.Buff ?? {}),
      Skill: pickNonZero(iv.Skill ?? {}),
      Item: pickNonZero(iv.Item ?? {}),
      Set: pickNonZero(iv.Set ?? {}),
      Mundus: pickNonZero(iv.Mundus ?? {}),
      Food: pickNonZero(iv.Food ?? {}),
      SkillBonusSpellDmg: { ...(iv.SkillBonusSpellDmg ?? {}) },
      SkillBonusWeaponDmg: { ...(iv.SkillBonusWeaponDmg ?? {}) },
      SkillLineSpellDmg: { ...(iv.SkillLineSpellDmg ?? {}) },
      SkillLineWeaponDmg: { ...(iv.SkillLineWeaponDmg ?? {}) },
    },
    cpNodes,
    statSources,
  };
}
