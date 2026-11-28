/**
 * Loads the committed game-data artifact (`vendor/uesp-data/uesp-game-data.json`).
 *
 * The artifact is produced outside this repository by the project's private data
 * pipeline and committed here — this repo never fetches it from UESP. Intended
 * for tests and for checkout-based consumers; the npm tarball does not ship the
 * JSON, so package consumers provide their own `initData`.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { UespInitData } from './types.js';

const JSON_PATH = path.resolve(
  import.meta.dirname,
  '../../../vendor/uesp-data/uesp-game-data.json',
);

export function loadInitData(): UespInitData {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')) as UespInitData;
}
