import { calculateBuild } from './calculator';
import type { BuildInput, ComputedStats } from './types';

// ---------------------------------------------------------------------------
// Tipos de debug — vivem aqui (não em types.ts) porque são internos à
// ferramenta de diagnóstico, não parte da superfície principal da lib.
// ---------------------------------------------------------------------------

export interface BuildDebugStatSource {
  name: string;
  abilityId?: number | string;
  value: number | string;
}

export interface BuildDebugCpNode {
  name: string;
  points: number;
  isUnlocked: boolean;
}

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
  /** Todos os computed stats calculados (mesmo que raw em ComputedStats). */
  computedStats: Record<string, number>;
  /** Valores de entrada por categoria, filtrados para não-zero (exceto SkillBonus/SkillLine). */
  inputValues: BuildDebugInputValues;
  /** Estado dos CP nodes: quais estavam ativos (isUnlocked) e com quantos pontos. */
  cpNodes: Record<string, BuildDebugCpNode>;
  /**
   * Fontes de cada input stat: registradas pelo engine durante GetEsoInputValues.
   * Útil para rastrear de onde vem um valor inesperado (ex: qual passivo setou SkillBonusSpellDmg.Flame).
   */
  statSources: Record<string, BuildDebugStatSource[]>;
}

function pickNonZero(obj: Record<string, any>): Record<string, number> {
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
 *   except SkillBonus/SkillLine que são sempre incluídos para facilitar inspeção)
 * - `cpNodes`: estado dos CP nodes (nome, pontos, isUnlocked)
 * - `statSources`: registro de fontes por stat — qual passivo/CP/buff setou cada valor;
 *   útil para rastrear de onde vem um valor inesperado
 *
 * Por que o monkey-patch em GetEsoInputValues:
 * Chamar GetEsoInputValues() uma segunda vez após calculateBuild() dá resultados
 * incorretos porque g_EsoComputedStats já tem os valores da primeira rodada, e algumas
 * regras de passivos os leem indiretamente. O patch captura os inputValues exatos usados
 * no cálculo, sem re-executá-lo.
 *
 * Must be called after initEsoEngine().
 */
export function debugBuild(input: BuildInput): BuildDebugInfo {
  const g = global as any;

  let capturedIv: any = null;
  const origGetInputValues = g.GetEsoInputValues;

  if (typeof origGetInputValues === 'function') {
    g.GetEsoInputValues = function (mergeComputedStats: any) {
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

  const iv: any = capturedIv ?? {};

  // CP node states — lê g_EsoCpData que ainda está populado do calculateBuild
  const cpNodes: Record<string, BuildDebugCpNode> = {};
  const cpDataGlobal: Record<string, any> = g.g_EsoCpData ?? {};
  const cpSkills: Record<string, any> = g.g_EsoCpSkills ?? {};
  for (const [nodeId, cpData] of Object.entries(cpDataGlobal)) {
    if (!cpData || cpData.type !== 'skill') continue;
    // g_EsoCpData não armazena points — lê do input original
    const inputNode = input.championPointNodes?.[nodeId];
    cpNodes[nodeId] = {
      name: cpData.name ?? cpSkills[nodeId]?.name ?? `CP_${nodeId}`,
      points: Number(inputNode?.points ?? 0),
      isUnlocked: cpData.isUnlocked === true,
    };
  }

  // Stat sources — populados pelo engine em AddEsoInputStatSource durante GetEsoInputValues
  const statSources: Record<string, BuildDebugStatSource[]> = {};
  const rawSources: Record<string, any[]> = g.g_EsoInputStatSources ?? {};
  for (const [statId, sources] of Object.entries(rawSources)) {
    statSources[statId] = (sources as any[]).map((s) => ({
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
