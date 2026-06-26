"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugBuild = debugBuild;
const calculator_1 = require("./calculator");
function pickNonZero(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object')
        return out;
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number' && v !== 0)
            out[k] = v;
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
 * Must be called after initEsoEngineFromData().
 */
function debugBuild(input) {
    const g = global;
    let capturedIv = null;
    const origGetInputValues = g.GetEsoInputValues;
    if (typeof origGetInputValues === 'function') {
        g.GetEsoInputValues = function (mergeComputedStats) {
            const iv = origGetInputValues.call(this, mergeComputedStats);
            capturedIv = iv;
            return iv;
        };
    }
    let stats;
    try {
        stats = (0, calculator_1.calculateBuild)(input);
    }
    finally {
        if (typeof origGetInputValues === 'function')
            g.GetEsoInputValues = origGetInputValues;
    }
    const iv = capturedIv ?? {};
    // CP node states — lê g_EsoCpData que ainda está populado do calculateBuild
    const cpNodes = {};
    const cpDataGlobal = g.g_EsoCpData ?? {};
    const cpSkills = g.g_EsoCpSkills ?? {};
    for (const [nodeId, cpData] of Object.entries(cpDataGlobal)) {
        if (!cpData || cpData.type !== 'skill')
            continue;
        // g_EsoCpData não armazena points — lê do input original
        const inputNode = input.championPointNodes?.[nodeId];
        cpNodes[nodeId] = {
            name: cpData.name ?? cpSkills[nodeId]?.name ?? `CP_${nodeId}`,
            points: Number(inputNode?.points ?? 0),
            isUnlocked: cpData.isUnlocked === true,
        };
    }
    // Stat sources — populados pelo engine em AddEsoInputStatSource durante GetEsoInputValues
    const statSources = {};
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
//# sourceMappingURL=debug.js.map