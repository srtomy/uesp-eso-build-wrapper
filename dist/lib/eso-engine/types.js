"use strict";
/**
 * Public types for uesp-eso-build-wrapper.
 *
 * DATA FLOW:
 * 1. Your front-end fetches item data from the UESP public API:
 *    https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
 * 2. Pass the returned object (UespItemApiData) directly to BuildInput.items[slot].
 * 3. Call calculateBuild(input) — the library injects everything into the UESP engine
 *    and returns the computed stats.
 *
 * UPDATING AFTER A NEW PATCH (when ZeniMax releases a new DLC):
 *   1. In vendor/uesp-esochardata/, run:
 *      git fetch upstream && git merge upstream/master
 *   2. Download the latest UESP SQL dumps and seed local.db.
 *   3. Run: npm run generate-data -- --db /path/to/local.db --version <patch>
 *   4. Commit vendor/uesp-data/uesp-game-data.json
 *   5. Run tests: npm test
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map