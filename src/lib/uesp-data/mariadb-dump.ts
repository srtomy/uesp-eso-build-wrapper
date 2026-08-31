/**
 * Parser de dumps MariaDB (formato `mysqldump`) — zero dependências.
 *
 * Adaptado de `eso-build-editor/scripts/seed.ts`. Suporta arquivos `.sql`
 * (plain), `.sql.gz` (gzip) e `.sql.zip` (via binário `unzip`), escaneando em
 * streaming os statements `INSERT INTO \`<tabela>\` VALUES ...`.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import type { Readable } from 'stream';

export type SqlValue = string | number | null;

/**
 * Parseia uma linha de valores MariaDB do formato:
 *   (val1, val2, 'str\'esc', NULL), (val1, val2), ...
 * Retorna array de rows, cada row é array de SqlValue.
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
    // i está no '\'' de abertura
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
    // i está no '('
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
      if (i === before) break; // input malformado — evita loop infinito
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

/** Falha se a linha do dump não tem a quantidade esperada de colunas. */
export function assertCols(cols: SqlValue[], expected: number, table: string): void {
  if (cols.length !== expected) {
    throw new Error(
      `${table}: esperado ${expected} colunas, recebido ${cols.length} — re-verifique o dump`,
    );
  }
}

/** Abre um dump (.sql / .sql.gz / .sql.zip) como stream de texto. */
export async function openDump(filePath: string): Promise<Readable> {
  if (filePath.endsWith('.gz')) {
    return createReadStream(filePath).pipe(createGunzip());
  }
  if (filePath.endsWith('.zip')) {
    // usa o binário `unzip` para descompactar (zip não tem stream nativo no Node)
    const { spawn } = await import('child_process');
    const proc = spawn('unzip', ['-p', filePath]);
    proc.stderr.on('data', () => {}); // suppress stderr
    return proc.stdout;
  }
  return createReadStream(filePath);
}

/**
 * Varre um dump em streaming e produz, uma a uma, as linhas do statement
 * `INSERT INTO \`tableName\` VALUES ...`. Valores saem na ordem das colunas
 * do CREATE TABLE original do dump.
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
 * Encontra o dump mais recente de um prefixo (`buildEditor`, `cp`, ...) num
 * diretório. Ordena pelo número no nome do arquivo quando existir
 * (`buildEditor50` > `buildEditor49`), caindo para ordenação alfabética.
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
