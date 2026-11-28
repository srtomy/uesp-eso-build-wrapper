/**
 * uesp-eso-build-wrapper — Public API
 *
 * A Node.js wrapper around the UESP ESO Build Editor math engine.
 * Calculates Elder Scrolls Online Computed Character Statistics
 * (Health, Magicka, Stamina, mitigation, crit, regeneration, etc.)
 * using UESP's own formulas — no reimplementation needed.
 *
 * QUICK START:
 * ```ts
 * import { initEsoEngineFromData, calculateBuild } from 'uesp-eso-build-wrapper';
 * import { readFileSync } from 'node:fs';
 *
 * // Copy vendor/uesp-data/uesp-game-data.json from the repository and load it
 * const data = JSON.parse(readFileSync('./uesp-game-data.json', 'utf-8'));
 * initEsoEngineFromData({ initData: data });
 *
 * const stats = calculateBuild({
 *   character: {
 *     race: 'High Elf',
 *     class: 'Sorcerer',
 *     level: 50,
 *     attributes: { health: 0, magicka: 64, stamina: 0 },
 *   },
 *   items: {
 *     // Any object matching UespItemApiData (itemId, type, trait, quality, …)
 *     Chest: myItemPayload,
 *   },
 * });
 *
 * console.log(stats.Magicka, stats.SpellDamage);
 * ```
 *
 * UPDATING FORMULAS after a new ESO patch:
 *   1. In vendor/uesp-esochardata/, run: git fetch origin && git merge origin/master
 *   2. Refresh vendor/uesp-data/uesp-game-data.json for the new patch
 *      (this repo never fetches from UESP — the file is a committed artifact)
 *   3. Commit vendor/uesp-data/uesp-game-data.json
 *   4. Run tests: npm test
 */

import * as path from 'path';
import { setupNodeEnvironment } from './env-setup.js';
import { loadUespEngine, resetEngineLoader } from './loader.js';
import { calculateBuild } from './calculator.js';
import type { UespInitData } from './types.js';

export type {
  BuildInput,
  BuffInfo,
  BuffEffect,
  BuffGroup,
  PassiveSkillInfo,
  ToggleSkillInfo,
  ToggleSkillInput,
  ComputedStats,
  CalculatedBuild,
  SetToggle,
  UespItemApiData,
  EquipSlot,
  UespInitData,
  ChampionPointNode,
  SkillSlot,
  CpDiscipline,
  CpNode,
  CpLink,
  CpCluster,
  CpTree,
} from './types.js';
export {
  calculateBuild,
  listAvailableBuffs,
  listRacialPassives,
  listClassPassives,
  listInherentPassives,
  listPassivesBySkillLine,
  listAvailableSkillLines,
  listAvailableToggleSkills,
} from './calculator.js';
export { getCpTree, buildCpTree, resetCpTreeCache } from './cp-tree.js';
export type { CpTreeSource } from './cp-tree.js';
export {
  buildCpLinks,
  buildCpParentMap,
  computePurchaseableNodes,
  isCpNodePurchaseable,
  createCpGate,
} from './cp-gate.js';
export type { CpGate, CpGateNode, CpRawLink } from './cp-gate.js';
export { debugBuild } from './debug.js';
export type {
  BuildDebugInfo,
  BuildDebugInputValues,
  BuildDebugCpNode,
  BuildDebugStatSource,
} from './debug.js';
import { cacheStatObjects } from './calculator.js';

let initialized = false;

/** Options for {@link initEsoEngineFromData}. */
export interface EsoEngineFromDataOptions {
  /** Parsed UESP game data (formulas, buffs, CP rules, skills...). */
  initData: UespInitData;
}

/**
 * Initializes the UESP math engine from a pre-parsed `UespInitData` object.
 *
 * **Must be called once** before `calculateBuild()` or `debugBuild()`.
 * Subsequent calls are no-ops — the engine loads exactly once per process.
 *
 * Use this when the game data comes from a file, database or external source
 * instead of the package's vendored JSON. The vendor scripts path is resolved
 * internally from the package installation.
 *
 * @param options - {@link EsoEngineFromDataOptions} with the parsed game data.
 * @throws If the vendor UESP scripts cannot be read from the package.
 *
 * @example
 * ```ts
 * import fs from 'fs';
 * import { initEsoEngineFromData } from 'uesp-eso-build-wrapper';
 * import type { UespInitData } from 'uesp-eso-build-wrapper';
 *
 * const initData = JSON.parse(fs.readFileSync('uesp-game-data.json', 'utf-8')) as UespInitData;
 * initEsoEngineFromData({ initData });
 * ```
 */
export function initEsoEngineFromData({ initData }: EsoEngineFromDataOptions): void {
  if (initialized) return;
  const pkgRoot = path.resolve(import.meta.dirname, '../../..');
  const resourcesPath = path.join(pkgRoot, 'vendor/uesp-esochardata/resources');
  setupNodeEnvironment();
  loadUespEngine(resourcesPath, initData);
  cacheStatObjects();
  initialized = true;
}

/**
 * Resets initialization state.
 * @internal For testing only — not part of the public API.
 */
export function resetEngine(): void {
  initialized = false;
  resetEngineLoader();
}

export { calculateBuild as default };
