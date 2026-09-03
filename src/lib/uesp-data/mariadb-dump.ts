/**
 * MariaDB dump parser (mysqldump format) — zero dependencies.
 *
 * Adapted from `eso-build-editor/scripts/seed.ts`. Supports `.sql` files
 * (plain), `.sql.gz` (gzip) and `.sql.zip` (via the `unzip` binary), scanning in
 * streaming fashion the `INSERT INTO \`<table>\` VALUES ...` statements.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import type { Readable } from 'stream';

export type SqlValue = string | number | null;

/**
 * Parses a MariaDB values line of the form:
 *   (val1, val2, 'str\'esc', NULL), (val1, val2), ...
 * Returns an array of rows, each row an array of SqlValue.
 */
export function parseInsertValues(line: string): SqlValue[][] {
  const rows: SqlValue[][] = [];
  let i = 0;
  const len = line.length;

  function skipWhitespace() {
    while (i < len && (line[i] === ' ' || line[i] === '\t' || line[i] === '\n' || line[i] === '\r'))
      i++;
  }

  function parseString(): string {
    // i is on the opening '\''
    i++; // consume '
    let result = '';
    while (i < len) {
      const ch = line[i];
      if (ch === '\\') {
        i++;
        const esc = line[i];
        switch (esc) {
          case 'n':
            result += '\n';
            break;
          case 'r':
            result += '\r';
            break;
          case 't':
            result += '\t';
            break;
          case '0':
            result += '\0';
            break;
          case "'":
            result += "'";
            break;
          case '"':
            result += '"';
            break;
          case '\\':
            result += '\\';
            break;
          default:
            result += esc;
        }
        i++;
      } else if (ch === "'") {
        i++; // consume closing '
        // MariaDB doubles: '' → '
        if (i < len && line[i] === "'") {
          result += "'";
          i++;
        } else {
          break;
        }
      } else {
        result += ch;
        i++;
      }
    }
    return result;
  }

  function parseValue(): SqlValue {
    skipWhitespace();
    if (i >= len) return null;

    if (line.startsWith('NULL', i)) {
      i += 4;
      return null;
    }

    if (line[i] === "'") {
      return parseString();
    }

    // number (int or float, possibly negative)
    let num = '';
    if (line[i] === '-') {
      num += '-';
      i++;
    }
    while (i < len && ((line[i] >= '0' && line[i] <= '9') || line[i] === '.')) {
      num += line[i++];
    }
    if (num === '' || num === '-') return null;
    return num.includes('.') ? parseFloat(num) : parseInt(num, 10);
  }

  function parseRow(): SqlValue[] {
    // i is on the '('
    i++; // consume (
    const values: SqlValue[] = [];
    while (i < len) {
      skipWhitespace();
      if (line[i] === ')') {
        i++;
        break;
      }
      if (line[i] === ',') {
        i++;
        continue;
      }
      const before = i;
      values.push(parseValue());
      if (i === before) break; // malformed input — avoid infinite loop
    }
    return values;
  }

  while (i < len) {
    skipWhitespace();
    if (i >= len) break;
    if (line[i] === '(') {
      rows.push(parseRow());
    } else if (line[i] === ',') {
      i++;
    } else if (line[i] === ';') {
      break;
    } else {
      i++; // skip unexpected chars
    }
  }

  return rows;
}

/** Fails if the dump row doesn't have the expected column count. */
export function assertCols(cols: SqlValue[], expected: number, table: string): void {
  if (cols.length !== expected) {
    throw new Error(
      `${table}: expected ${expected} columns, got ${cols.length} — double-check the dump`,
    );
  }
}

/** Opens a dump (.sql / .sql.gz / .sql.zip) as a text stream. */
export async function openDump(filePath: string): Promise<Readable> {
  if (filePath.endsWith('.gz')) {
    return createReadStream(filePath).pipe(createGunzip());
  }
  if (filePath.endsWith('.zip')) {
    // uses the `unzip` binary to decompress (zip has no native Node stream)
    const { spawn } = await import('child_process');
    const proc = spawn('unzip', ['-p', filePath]);
    proc.stderr.on('data', () => {}); // suppress stderr
    return proc.stdout;
  }
  return createReadStream(filePath);
}

/**
 * Scans a dump in streaming fashion yielding, one by one, the rows of the
 * `INSERT INTO \`tableName\` VALUES ...` statement. Values come out in the column order
 * of the dump's original CREATE TABLE.
 */
export async function* iterateDumpRows(
  dumpFile: string,
  tableName: string,
): AsyncGenerator<SqlValue[], void, unknown> {
  const stream = await openDump(dumpFile);
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const prefix = `INSERT INTO \`${tableName}\` VALUES`;

  let inInsert = false;
  let insertBuffer = '';

  try {
    for await (const line of rl) {
      const trimmed = line.trim();

      if (trimmed.startsWith(prefix)) {
        inInsert = true;
        insertBuffer = trimmed.slice(prefix.length).trim();
      } else if (inInsert) {
        insertBuffer += ' ' + trimmed;
      }

      if (inInsert && insertBuffer.trimEnd().endsWith(';')) {
        const sql = insertBuffer.trimEnd().slice(0, -1);
        for (const row of parseInsertValues(sql)) yield row;
        inInsert = false;
        insertBuffer = '';
      }
    }

    if (inInsert && insertBuffer.trim()) {
      const sql = insertBuffer.trimEnd().replace(/;$/, '');
      for (const row of parseInsertValues(sql)) yield row;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

/**
 * Finds the most recent dump for a prefix (`buildEditor`, `cp`, ...) in a
 * directory. Sorts by the number in the file name when present
 * (`buildEditor50` > `buildEditor49`), falling back to alphabetical order.
 */
export function findDumpFile(dir: string, prefix: string): string | null {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && /\.sql\.(gz|zip)$/.test(f));
  if (files.length === 0) return null;

  const patchNum = (f: string): number => {
    const m = f.match(/(\d+)\.sql\.(gz|zip)$/);
    return m ? parseInt(m[1], 10) : -1;
  };
  files.sort((a, b) => patchNum(a) - patchNum(b) || a.localeCompare(b));
  return path.join(dir, files[files.length - 1]);
}
