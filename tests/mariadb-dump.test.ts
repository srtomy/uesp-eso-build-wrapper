import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gzipSync } from 'zlib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertCols,
  buildUespGameData,
  findDumpFile,
  iterateDumpRows,
  parseInsertValues,
} from '../src/lib/uesp-data';
import { vi } from 'vitest';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uesp-mariadb-dump-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeGzip(fileName: string, content: string): string {
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, gzipSync(content));
  return filePath;
}

describe('parseInsertValues', () => {
  it('parseia tupla simples com NULL e números', () => {
    expect(parseInsertValues("(1,'abc',NULL),(2,'x',-3.5)")).toEqual([
      [1, 'abc', null],
      [2, 'x', -3.5],
    ]);
  });

  it('parseia inteiro negativo e float', () => {
    expect(parseInsertValues('(-5,2.75,-0.5)')).toEqual([[-5, 2.75, -0.5]]);
  });

  it('unescapes sequências MariaDB (\\n, \\r, \\t, \\0, \\", \\\\)', () => {
    expect(parseInsertValues("( 'a\\nb','c\\rd','e\\tf','g\\0h','i\"j','k\\\\l' )")).toEqual([
      ['a\nb', 'c\rd', 'e\tf', 'g\0h', 'i"j', 'k\\l'],
    ]);
  });

  it("converte aspas duplas escapadas (\\') em aspas simples", () => {
    expect(parseInsertValues("( 'Syrabane\\'s Ward' )")).toEqual([["Syrabane's Ward"]]);
  });

  it("converte aspas duplas dobradas ('') em aspas simples", () => {
    expect(parseInsertValues("( 'Syrabane''s Ward' )")).toEqual([["Syrabane's Ward"]]);
  });

  it('mantém vírgulas e parênteses dentro de strings', () => {
    expect(parseInsertValues("( '(a, b)', 'x,y' )")).toEqual([['(a, b)', 'x,y']]);
  });

  it('parseia string vazia como string (não NULL)', () => {
    expect(parseInsertValues("( '', NULL )")).toEqual([['', null]]);
  });

  it('não entra em loop com input malformado', () => {
    expect(parseInsertValues("( a, 'x' )")).toEqual([[null]]);
  });

  it('para no ponto-e-vírgula final', () => {
    expect(parseInsertValues('(1, 2); LIXO')).toEqual([[1, 2]]);
  });
});

describe('assertCols', () => {
  it('passa com a quantidade exata', () => {
    expect(() => assertCols([1, null, 'a'], 3, 't')).not.toThrow();
  });

  it('falha com quantidade divergente', () => {
    expect(() => assertCols([1, 'a'], 3, 'rules')).toThrowError(/rules: esperado 3 colunas/);
  });
});

describe('iterateDumpRows', () => {
  it('varre INSERT em múltiplas linhas de um dump .sql.gz', async () => {
    const dump = [
      'CREATE TABLE `rules` (`id` int, `name` text);',
      "INSERT INTO `other` VALUES (9,'ignore');",
      "INSERT INTO `rules` VALUES (1,'first\\nline'),",
      "  (2,'second''s');",
      'INSERT INTO `rules` VALUES (3,NULL);',
    ].join('\n');
    const file = writeGzip('rules.sql.gz', dump);

    const rows: unknown[][] = [];
    for await (const row of iterateDumpRows(file, 'rules')) rows.push(row);

    expect(rows).toEqual([
      [1, 'first\nline'],
      [2, "second's"],
      [3, null],
    ]);
  });

  it('varre dump .sql plain', async () => {
    const file = path.join(tmpDir, 'plain.sql');
    fs.writeFileSync(file, "INSERT INTO `t` VALUES (10,'a');\n");

    const rows: unknown[][] = [];
    for await (const row of iterateDumpRows(file, 't')) rows.push(row);

    expect(rows).toEqual([[10, 'a']]);
  });
});

describe('findDumpFile', () => {
  it('retorna null quando não há dump do prefixo', () => {
    expect(findDumpFile(tmpDir, 'inexistente')).toBeNull();
  });

  it('pega o maior número de patch (novo)', () => {
    fs.writeFileSync(path.join(tmpDir, 'buildEditor49.sql.gz'), 'x');
    fs.writeFileSync(path.join(tmpDir, 'buildEditor50.sql.gz'), 'x');
    expect(findDumpFile(tmpDir, 'buildEditor')).toMatch(/buildEditor50\.sql\.gz$/);
  });

  it('ignora arquivos com extensão não-dump', () => {
    fs.writeFileSync(path.join(tmpDir, 'cp50.sql.gz'), 'x');
    fs.writeFileSync(path.join(tmpDir, 'cp50.sql.txt'), 'x');
    expect(findDumpFile(tmpDir, 'cp')).toMatch(/cp50\.sql\.gz$/);
  });
});

describe('buildUespGameData (skipApi — fixtures de dump)', () => {
  beforeAll(() => {
    writeGzip(
      'buildEditor50.sql.gz',
      [
        'CREATE TABLE `rules` (`id` int, `version` text, `ruleType` text, `nameId` text, `displayName` text, `matchRegex` text, `displayRegex` text, `statRequireId` text, `statRequireValue` text, `factorStatId` text, `isEnabled` int, `isVisible` int, `isToggle` int, `enableOffBar` int, `originalId` text, `icon` text, `groupName` text, `maxTimes` int, `comment` text, `description` text, `customData` text);',
        "INSERT INTO `rules` VALUES (40378,'50','buff','NameId','Display','',NULL,'','','',0,1,0,0,'','','',NULL,'comment','desc',NULL);",
        'CREATE TABLE `effects` (`id` int, `ruleId` int, `version` text, `statId` text, `value` text, `display` text, `category` text, `combineAs` text, `roundNum` text, `factorValue` real, `statDesc` text, `buffId` text, `regexVar` text);',
        "INSERT INTO `effects` VALUES (9000,40378,'50','Health','10','','','','',NULL,'','','');",
        'CREATE TABLE `computedStats` (`id` int, `statId` text, `version` text, `title` text, `roundNum` text, `addClass` text, `comment` text, `minimumValue` real, `maximumValue` real, `deferLevel` int, `display` text, `compute` text, `idx` int, `category` text, `suffix` text, `dependsOn` text);',
        "INSERT INTO `computedStats` VALUES (1,'Health','50','Health','','','',NULL,NULL,NULL,'','[\"300 * Level\", \"122 * Attribute.Health\", \"+\"]',0,'basic','',NULL);",
      ].join('\n'),
    );
    writeGzip(
      'cp50.sql.gz',
      [
        'CREATE TABLE `cp2Skills` (`id` int, `skillId` int, `parentSkillId` int, `abilityId` int, `disciplineIndex` int, `disciplineId` int, `skillIndex` int, `name` text, `skillType` int, `minDescription` text, `maxDescription` text, `maxValue` real, `isRoot` int, `isClusterRoot` int, `maxPoints` int, `jumpPoints` text, `jumpPointDelta` int, `numJumpPoints` int, `x` real, `y` real, `a` real, `b` real, `c` real, `d` real, `r2` real, `fitDescription` text);',
        "INSERT INTO `cp2Skills` VALUES (39,163,-1,59526,2,1,10,'Foresight',1,'min','max',2.5,0,0,10,'[1,2]',1,3,566.5,100.25,-1,-1,-1,-1,-1,'fit');",
        'CREATE TABLE `cp2SkillDescriptions` (`id` int, `abilityId` int, `skillId` int, `points` int, `description` text);',
        "INSERT INTO `cp2SkillDescriptions` VALUES (1,59526,163,0,'desc zero');",
        "INSERT INTO `cp2SkillDescriptions` VALUES (2,59526,163,1,'desc um');",
      ].join('\n'),
    );
  });

  it('popula as 5 tabelas de dump e resolve a versão máxima', async () => {
    const { initData, version, counts } = await buildUespGameData({
      dumpDir: tmpDir,
      skipApi: true,
    });

    expect(version).toBe('50');
    expect(counts).toEqual({
      rules: 1,
      effects: 1,
      computedStats: 1,
      cp2Skills: 1,
      cp2SkillDescriptions: 2,
    });

    // computedStats: compute parseado de JSON, ids como string
    const cs = initData.computedStats.Health as Record<string, unknown>;
    expect(cs).toMatchObject({
      id: '1',
      statId: 'Health',
      version: '50',
      idx: '0',
      compute: ['300 * Level', '122 * Attribute.Health', '+'],
    });

    // rules + effects: join por ruleId, bools convertidos
    const rule = (initData.buildRules as Record<string, Record<string, Record<string, unknown>>>)
      .buff['40378'];
    expect(rule).toMatchObject({ id: 40378, version: '50', isEnabled: false, isVisible: true });
    expect(rule.effects).toMatchObject([
      { id: '9000', ruleId: '40378', statId: 'Health', value: '10', round: '' },
    ]);

    // cp2Skills: reais viram string no mapeamento
    const cp = (initData.cpSkillsData ?? {})['59526'] as Record<string, unknown>;
    expect(cp).toMatchObject({
      id: '39',
      abilityId: '59526',
      maxValue: '2.5',
      x: '566.5',
      a: '-1',
      jumpPoints: '[1,2]',
    });

    // cp2SkillDescriptions indexado por points
    expect((initData.cpSkillDescData ?? {})['59526']).toEqual(['desc zero', 'desc um']);

    // skipApi: skillsData vazio
    expect(initData.skillsData).toEqual({});
  });

  it('falha claramente quando o dump não existe', async () => {
    await expect(
      buildUespGameData({ dumpDir: path.join(tmpDir, 'vazio-inexistente'), skipApi: true }),
    ).rejects.toThrowError(/não encontrado/);
  });

  it('popula as tabelas da API quando skipApi é false', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ playerSkills: [], skillTree: [] }), { status: 200 }),
      );

    try {
      const result = await buildUespGameData({ dumpDir: tmpDir });
      expect(result.counts.playerSkills).toBe(0);
      expect(result.counts.skillTree).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('falha quando a API retorna um erro de aplicação', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () => new Response(JSON.stringify({ error: 'rate limited' }), { status: 200 }),
      );

    try {
      await expect(buildUespGameData({ dumpDir: tmpDir })).rejects.toThrow(/rate limited/);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
