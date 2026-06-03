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
 * import { initEsoEngine, calculateBuild } from 'uesp-eso-build-wrapper';
 *
 * // Initialize once (singleton) — no args needed when installed via npm
 * initEsoEngine();
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
 *   2. Open https://esobuilds.uesp.net in a browser.
 *   3. Run vendor/uesp-data/browser-extract.js in the DevTools Console.
 *   4. Save the downloaded JSON to vendor/uesp-data/uesp-init-data.json.
 *   5. Run tests: npm test
 */

import * as path from 'path';
import {setupNodeEnvironment} from './env-setup';
import {loadUespEngine} from './loader';
import {calculateBuild} from './calculator';

export type {
  BuildInput,
  ComputedStats,
  UespItemApiData,
  EquipSlot,
  UespInitData,
  ChampionPointNode,
  SkillSlot,
} from './types';
export { calculateBuild } from './calculator';

let initialized = false;

/**
 * Initializes the UESP math engine. Must be called ONCE before calculateBuild().
 * Safe to call multiple times — only executes on the first call.
 *
 * When installed via npm, both arguments are optional and resolve automatically
 * to the bundled vendor files inside node_modules/uesp-eso-build-wrapper/.
 *
 * @param uespResourcesPath - Path to the UESP fork's resources/ folder.
 * @param initDataPath - Path to the uesp-init-data.json file with game formulas.
 */
export function initEsoEngine(uespResourcesPath?: string, initDataPath?: string): void {
  if (initialized) return;

  // __dirname resolves to dist/lib/eso-engine/ in the built package.
  // Going up 3 levels reaches the package root (node_modules/uesp-eso-build-wrapper/).
  const pkgRoot = path.resolve(__dirname, '../../..');

  const resourcesPath =
      uespResourcesPath ?? path.join(pkgRoot, 'vendor/uesp-esochardata/resources');
  const dataPath = initDataPath ?? path.join(pkgRoot, 'vendor/uesp-data/uesp-init-data.json');

  setupNodeEnvironment();
  loadUespEngine(resourcesPath, dataPath);

  initialized = true;
}

/**
 * Resets initialization state.
 * @internal For testing only — not part of the public API.
 */
export function resetEngine(): void {
  initialized = false;
  const { resetEngineLoader } = require('./loader');
  resetEngineLoader();
}

export { calculateBuild as default };
