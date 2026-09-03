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
 *     // `GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>`
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
  ComputedStats,
  UespItemApiData,
  EquipSlot,
  UespInitData,
  ChampionPointNode,
  SkillSlot,
} from './types.js';
export {
  calculateBuild,
  listAvailableBuffs,
  listRacialPassives,
  listClassPassives,
  listPassivesBySkillLine,
  listAvailableSkillLines,
  listAvailableToggleSkills,
} from './calculator.js';
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
