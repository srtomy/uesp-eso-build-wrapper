/**
 * Loads the committed game-data artifact (`vendor/uesp-data/uesp-game-data.json`).
 *
 * The artifact is committed to this repository; this package never fetches it
 * from UESP. Intended for tests and for checkout-based consumers; the npm
 * tarball does not ship the JSON, so package consumers provide their own
 * `initData`.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { UespInitData } from './types.js';

const JSON_PATH = path.resolve(
  import.meta.dirname,
  '../../../vendor/uesp-data/uesp-game-data.json',
);

export function loadInitData(jsonPath: string = JSON_PATH): UespInitData {
  let raw: string;
  try {
    raw = fs.readFileSync(jsonPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `[eso-engine] Game data artifact not found: ${jsonPath}\n` +
        `The committed game data ships at vendor/uesp-data/uesp-game-data.json ` +
        `— restore it from the repository (see CONTRIBUTING.md).\n` +
        `Cause: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  try {
    return JSON.parse(raw) as UespInitData;
  } catch (err) {
    throw new Error(
      `[eso-engine] Game data artifact is not valid JSON: ${jsonPath}\n` +
        `Restore vendor/uesp-data/uesp-game-data.json from the repository.\n` +
        `Cause: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
