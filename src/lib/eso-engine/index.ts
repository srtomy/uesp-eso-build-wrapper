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
 * import data from 'uesp-eso-build-wrapper/vendor/uesp-data/uesp-game-data.json';
 *
 * // Initialize once (singleton) with the bundled game data
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
 *     // Pass the object returned by:
 *     // GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
 *     Chest: uespApiResponse.minedItem[0],
 *   },
 * });
 *
 * console.log(stats.Magicka, stats.SpellDamage);
 * ```
 *
 * UPDATING FORMULAS after a new ESO patch:
 *   1. In vendor/uesp-esochardata/, run: git fetch upstream && git merge upstream/master
 *   2. Download the latest UESP SQL dumps and seed local.db (see eso-build-editor/scripts/seed.ts)
 *   3. Run: npm run generate-data -- --db /path/to/local.db --version <patch>
 *   4. Commit vendor/uesp-data/uesp-game-data.json
 *   5. Run tests: npm test
 */

import * as path from 'path';
import { setupNodeEnvironment } from './env-setup';
import { loadUespEngine, resetEngineLoader } from './loader';
import { calculateBuild } from './calculator';
import type { UespInitData } from './types';

export type {
  BuildInput,
  BuffInfo,
  BuffEffect,
  BuffGroup,
  PassiveSkillInfo,
  ToggleSkillInfo,
  ComputedStats,
  UespItemApiData,
  EquipSlot,
  UespInitData,
  ChampionPointNode,
  SkillSlot,
} from './types';
export {
  calculateBuild,
  listAvailableBuffs,
  listRacialPassives,
  listClassPassives,
  listPassivesBySkillLine,
  listAvailableSkillLines,
  listAvailableToggleSkills,
} from './calculator';
export { debugBuild } from './debug';
export type {
  BuildDebugInfo,
  BuildDebugInputValues,
  BuildDebugCpNode,
  BuildDebugStatSource,
} from './debug';
import { cacheStatObjects } from './calculator';

let initialized = false;

export interface EsoEngineFromDataOptions {
  initData: UespInitData;
}

/**
 * Initializes the UESP math engine from a pre-parsed `UespInitData` object.
 * Use when data comes from a database or external source instead of the bundled JSON file.
 * The vendor resources path is resolved internally from the package.
 */
export function initEsoEngineFromData({ initData }: EsoEngineFromDataOptions): void {
  if (initialized) return;
  const pkgRoot = path.resolve(__dirname, '../../..');
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
