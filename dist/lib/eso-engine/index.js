"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.debugBuild = exports.listAvailableToggleSkills = exports.listAvailableSkillLines = exports.listPassivesBySkillLine = exports.listClassPassives = exports.listRacialPassives = exports.listAvailableBuffs = exports.calculateBuild = void 0;
exports.initEsoEngineFromData = initEsoEngineFromData;
exports.resetEngine = resetEngine;
const path = __importStar(require("path"));
const env_setup_1 = require("./env-setup");
const loader_1 = require("./loader");
const calculator_1 = require("./calculator");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return calculator_1.calculateBuild; } });
var calculator_2 = require("./calculator");
Object.defineProperty(exports, "calculateBuild", { enumerable: true, get: function () { return calculator_2.calculateBuild; } });
Object.defineProperty(exports, "listAvailableBuffs", { enumerable: true, get: function () { return calculator_2.listAvailableBuffs; } });
Object.defineProperty(exports, "listRacialPassives", { enumerable: true, get: function () { return calculator_2.listRacialPassives; } });
Object.defineProperty(exports, "listClassPassives", { enumerable: true, get: function () { return calculator_2.listClassPassives; } });
Object.defineProperty(exports, "listPassivesBySkillLine", { enumerable: true, get: function () { return calculator_2.listPassivesBySkillLine; } });
Object.defineProperty(exports, "listAvailableSkillLines", { enumerable: true, get: function () { return calculator_2.listAvailableSkillLines; } });
Object.defineProperty(exports, "listAvailableToggleSkills", { enumerable: true, get: function () { return calculator_2.listAvailableToggleSkills; } });
var debug_1 = require("./debug");
Object.defineProperty(exports, "debugBuild", { enumerable: true, get: function () { return debug_1.debugBuild; } });
const calculator_3 = require("./calculator");
let initialized = false;
/**
 * Initializes the UESP math engine from a pre-parsed `UespInitData` object.
 * Use when data comes from a database or external source instead of the bundled JSON file.
 * The vendor resources path is resolved internally from the package.
 */
function initEsoEngineFromData({ initData }) {
    if (initialized)
        return;
    const pkgRoot = path.resolve(__dirname, '../../..');
    const resourcesPath = path.join(pkgRoot, 'vendor/uesp-esochardata/resources');
    (0, env_setup_1.setupNodeEnvironment)();
    (0, loader_1.loadUespEngine)(resourcesPath, initData);
    (0, calculator_3.cacheStatObjects)();
    initialized = true;
}
/**
 * Resets initialization state.
 * @internal For testing only — not part of the public API.
 */
function resetEngine() {
    initialized = false;
    (0, loader_1.resetEngineLoader)();
}
//# sourceMappingURL=index.js.map