/**
 * Motor de cálculo de builds do ESO.
 *
 * Implementa a ideia central da arquitetura:
 *
 *   1. Injetar dados do personagem nos elementos mock do DOM
 *      (jQuery vai ler via $("#esotbRace").val(), etc.)
 *
 *   2. Injetar dados dos itens DIRETAMENTE em g_EsoBuildItemData[slot]
 *      — sem precisar mockar jQuery para cada campo de item.
 *      Os campos vêm exatamente no formato da API pública da UESP:
 *      GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
 *
 *   3. Chamar UpdateEsoComputedStatsList_Real(null, true)
 *      — o parâmetro `noUpdate=true` faz o motor calcular tudo mas pular
 *      as atualizações de DOM (DisplayEsoAllComputedStats, UpdateReadOnlyStats, etc.)
 *
 *   4. Ler os resultados de g_EsoComputedStats[statId].value
 */
import type { BuffInfo, BuildInput, ComputedStats, PassiveSkillInfo, ToggleSkillInfo } from './types';
export declare function cacheStatObjects(): void;
/**
 * Calcula os Computed Character Statistics para a build fornecida.
 *
 * @example
 * ```ts
 * import { calculateBuild } from './src/lib/eso-engine';
 *
 * const stats = calculateBuild({
 *   character: { race: 'High Elf', class: 'Sorcerer', level: 50,
 *                attributes: { health: 0, magicka: 64, stamina: 0 } },
 *   items: {
 *     Chest: chestItemFromUespApi,  // objeto retornado por esolog.uesp.net/exportJson.php
 *   },
 * });
 * console.log(stats.MaxMagicka, stats.SpellDamage);
 * ```
 */
export declare function calculateBuild(input: BuildInput): ComputedStats;
/**
 * Returns the catalog of buffs available in the loaded UESP engine.
 *
 * Each entry maps to one row in the UESP buff tab. Pass `entry.name` to
 * `BuildInput.activeBuffs` to enable that buff in a calculation.
 *
 * Must be called after `initEsoEngineFromData()`.
 *
 * @param group - Optional filter. Ex: "Major", "Minor", "Set", "Target",
 *   "Skill", "Potion", "Poison", "Cyrodiil", "Other".
 *   Omit to return all 164 buffs.
 */
export declare function listAvailableBuffs(group?: string): BuffInfo[];
/**
 * Returns all racial passive skills for the given race.
 * Each passive may appear in multiple ranks (rank 1, 2, 3).
 * Pass the abilityId of the desired rank to BuildInput.passiveSkills.
 *
 * Must be called after initEsoEngineFromData().
 *
 * @param race - Race name as passed to BuildInput.character.race.
 *   Ex: "High Elf", "Nord", "Khajiit"
 */
export declare function listRacialPassives(race: string): PassiveSkillInfo[];
/**
 * Returns all class passive skills for the given class.
 * Each passive may appear in multiple ranks (rank 1, 2, 3).
 * Pass the abilityId of the desired rank to BuildInput.passiveSkills.
 *
 * Must be called after initEsoEngineFromData().
 *
 * @param className - Class name as passed to BuildInput.character.class.
 *   Ex: "Sorcerer", "Nightblade", "Dragonknight"
 */
export declare function listClassPassives(className: string): PassiveSkillInfo[];
/**
 * Returns all passive skills for the given skill line.
 * Each passive may appear in multiple ranks (rank 1, 2, 3).
 * Pass the abilityId of the desired rank to BuildInput.passiveSkills.
 *
 * Must be called after initEsoEngineFromData().
 *
 * @param skillLine - Skill line name as it appears in g_SkillsData.
 *   Use listAvailableSkillLines() to discover valid names.
 *   Examples: "Light Armor", "Heavy Armor", "Undaunted", "Destruction Staff",
 *   "Fighters Guild", "Mages Guild", "Psijic Order", "Assault", "Support",
 *   "Vampire", "Werewolf"
 */
export declare function listPassivesBySkillLine(skillLine: string): PassiveSkillInfo[];
/**
 * Returns all skill line names that have passive skills available.
 * Use the returned names with listPassivesBySkillLine().
 *
 * Must be called after initEsoEngineFromData().
 */
export declare function listAvailableSkillLines(): string[];
/**
 * Returns all available toggle skills from the loaded UESP engine.
 * Pass entry.name to BuildInput.toggleSkills to enable it.
 *
 * Note: toggle skills with requiresCyrodiil=true also need character.cyrodiil=true.
 * Toggle skills backed by a passive (isPassive=true) need the associated skill
 * in passiveSkills/skillBars for the engine to process the description match.
 *
 * Must be called after initEsoEngineFromData().
 */
export declare function listAvailableToggleSkills(): ToggleSkillInfo[];
//# sourceMappingURL=calculator.d.ts.map