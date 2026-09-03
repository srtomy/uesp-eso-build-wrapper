/**
 * Wrapper UESP data pipeline.
 *
 * `uesp-data` answers "how is the `UespInitData` obtained" (MariaDB dumps,
 * UESP API, SQLite database); `eso-engine` is the engine glue and consumes the
 * result — the dependency is one-way (uesp-data → eso-engine/types).
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
