/**
 * Wrapper UESP data pipeline.
 *
 * `uesp-data` answers "how is the `UespInitData` obtained" (MariaDB dumps,
 * UESP API, HTTP endpoints, SQLite database); `eso-engine` is the engine glue
 * and consumes the result — the dependency is one-way (uesp-data →
 * eso-engine/types).
 *
 * Two sources produce the same `UespInitData`:
 *   - `buildUespGameData`         — MariaDB dumps + `exportJson.php` (`db:seed`)
 *   - `buildUespGameDataFromHttp` — live UESP endpoints only (`fetch-http`)
 */

export { extractGameData, loadInitData } from './extract.js';
export type { MinimalDb } from './extract.js';
export { buildUespGameData } from './seed.js';
export type {
  BuildUespGameDataOptions,
  BuildUespGameDataResult,
  SeedProgressEvent,
  SeedProgressKind,
} from './seed.js';
export {
  EDITOR_PAGE_URL,
  assertPlausible,
  buildRulesToTableRows,
  buildUespGameDataFromHttp,
  fetchEditorPage,
  parseBuildRulesHtml,
} from './http-source.js';
export type {
  BuildRulesPayload,
  HttpBuildResult,
  HttpSourceOptions,
  ParsedBuildRules,
  RulesTableRows,
} from './http-source.js';
export { DEFAULT_API_BASE, DEFAULT_USER_AGENT, fetchApiRows } from './api.js';
export type { FetchApiOptions } from './api.js';
export type { ColumnSpec, SqlType } from './schema.js';
export {
  assertCols,
  findDumpFile,
  iterateDumpRows,
  openDump,
  parseInsertValues,
} from './mariadb-dump.js';
export type { SqlValue } from './mariadb-dump.js';
