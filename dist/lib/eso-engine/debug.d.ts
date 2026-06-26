import type { BuildInput } from './types';
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
 * Must be called after initEsoEngineFromData().
 */
export declare function debugBuild(input: BuildInput): BuildDebugInfo;
//# sourceMappingURL=debug.d.ts.map