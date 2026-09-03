/**
 * Pipeline de dados UESP do wrapper.
 *
 * `uesp-data` responde "como se obtém o `UespInitData`" (dumps MariaDB,
 * API UESP, banco SQLite); `eso-engine` é a glue da engine e consome o
 * resultado — a dependência é unidirecional (uesp-data → eso-engine/types).
 */

export { extractGameData, loadInitData } from './extract.js';
export type { MinimalDb } from './extract.js';
export { buildUespGameData } from './seed.js';
export type {
  BuildUespGameDataOptions,
  BuildUespGameDataResult,
  SeedProgressEvent,
  SeedProgressKind,
  ColumnSpec,
  SqlType,
} from './seed.js';
export {
  assertCols,
  findDumpFile,
  iterateDumpRows,
  openDump,
  parseInsertValues,
} from './mariadb-dump.js';
export type { SqlValue } from './mariadb-dump.js';
