/**
 * Testes para a resolução dinâmica de nomes e descrições dos nodes CP2.
 *
 * Contexto: calculator.ts popula g_EsoCpData[nodeId] usando os globals
 * g_EsoCpSkills (nomes) e g_EsoCpSkillDesc (descrições por nível de pontos).
 * Esses globals são injetados por loader.ts a partir de cpSkillsData e
 * cpSkillDescData no uesp-init-data.json (extraídos do browser).
 *
 * Os testes usam globals mockados para serem independentes do JSON extraído.
 * O comportamento do motor UESP (cálculo dos stats) não é testado aqui —
 * apenas a lógica de provisão de dados para o motor.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import path from 'path';
import { calculateBuild, initEsoEngine } from '../src/lib/eso-engine';

// ── Setup ─────────────────────────────────────────────────────────────────────

const RESOURCES = path.resolve(__dirname, '../vendor/uesp-esochardata/resources');
const INIT_DATA = path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json');

let originalCpSkills: unknown;
let originalCpSkillDesc: unknown;

beforeAll(() => {
  initEsoEngine(RESOURCES, INIT_DATA);
  // Save real JSON-loaded globals so clearMockCpGlobals can restore them
  // instead of replacing with empty objects (which would break other test files
  // that rely on the real data when tests run in different orders).
  originalCpSkills = (global as any).g_EsoCpSkills;
  originalCpSkillDesc = (global as any).g_EsoCpSkillDesc;
});

// Dados mockados que simulam o que o browser extrai após re-execução do
// browser-extract.js (g_EsoCpSkills e g_EsoCpSkillDesc injetados pelo loader).
const MOCK_CP_SKILLS = {
  '60494': { name: 'Inspiration Boost', disciplineIndex: 0 },
  '60500': { name: 'Gifted Rider', disciplineIndex: 1 },
};

const MOCK_CP_SKILL_DESC: Record<string, Record<string | number, string>> = {
  '60494': {
    0: 'Base description.',
    5: 'Desc at 5 pts.',
    10: 'Desc at 10 pts.',
  },
  '60500': {
    0: 'Rider base description.',
    20: 'Rider at 20 pts.',
  },
};

// Personagem mínimo para rodar calculateBuild sem interferência nos testes de CP.
const BASE_CHAR = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

/** Injeta os globals mockados e retorna a função de restore. */
function injectMockCpGlobals() {
  (global as any).g_EsoCpSkills = MOCK_CP_SKILLS;
  (global as any).g_EsoCpSkillDesc = MOCK_CP_SKILL_DESC;
}

/** Restaura os globals para os valores reais carregados do JSON. */
function clearMockCpGlobals() {
  (global as any).g_EsoCpSkills = originalCpSkills;
  (global as any).g_EsoCpSkillDesc = originalCpSkillDesc;
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('CP node injection — resolução de nome', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  it('g_EsoCpData é vazio após calculateBuild (reset automático confirmado)', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 5 } },
    });
    // Chama novamente sem nodes — o resultado anterior não deve persistir
    calculateBuild({ character: BASE_CHAR });
    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {}).length).toBe(0);
  });
});

describe('CP node injection — resolução de descrição', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  /**
   * Captura g_EsoCpData logo após calculateBuild injetar os nodes mas antes
   * do motor resetar. Usamos uma versão instrumentada via spy no objeto global.
   *
   * Estratégia: após calculateBuild, o motor chamou UpdateEsoComputedStatsList_Real
   * que reseta g_EsoCpData internamente. Para capturar o estado durante a injeção,
   * lemos g_EsoCpData antes de chamar calculateBuild e comparamos com o snapshot
   * que calculateBuild registra ao chamar o motor.
   *
   * Como não temos acesso a um hook interno, testamos o comportamento observável:
   * re-injetamos os mocks, chamamos calculateBuild com nodes, e checamos que
   * g_EsoCpData ESTÁ populado IMEDIATAMENTE ao retornar (antes que qualquer outro
   * código o limpe — o reset ocorre apenas no início da PRÓXIMA chamada).
   */
  function captureNodeAfterCall(nodeId: string, points?: number, description?: string): any {
    injectMockCpGlobals();
    const nodeData: any = {};
    if (points !== undefined) nodeData.points = points;
    if (description !== undefined) nodeData.description = description;

    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { [nodeId]: nodeData },
    });

    // g_EsoCpData é reset no INÍCIO da próxima chamada, não no final desta.
    // Portanto ainda está populado imediatamente após o retorno.
    return (global as any).g_EsoCpData?.[nodeId];
  }

  it('exact match: points=10 e chave 10 existe → usa "Desc at 10 pts."', () => {
    const node = captureNodeAfterCall('60494', 10);
    expect(node).toBeDefined();
    expect(node.description).toBe('Desc at 10 pts.');
  });

  it('floor lookup: points=7 (só existem 0,5,10) → usa chave 5 → "Desc at 5 pts."', () => {
    const node = captureNodeAfterCall('60494', 7);
    expect(node).toBeDefined();
    expect(node.description).toBe('Desc at 5 pts.');
  });

  it('floor lookup: points=3 (só existem 0,5,10) → usa chave 0 → "Base description."', () => {
    const node = captureNodeAfterCall('60494', 3);
    expect(node).toBeDefined();
    expect(node.description).toBe('Base description.');
  });

  it('sem points fornecido → fallback chave 0 → "Base description."', () => {
    const node = captureNodeAfterCall('60494', undefined);
    expect(node).toBeDefined();
    expect(node.description).toBe('Base description.');
  });

  it('description explícita → override ignora g_EsoCpSkillDesc', () => {
    const override = 'Grants 1 Max Magicka per stage. Current bonus: 1000';
    const node = captureNodeAfterCall('60494', 5, override);
    expect(node).toBeDefined();
    expect(node.description).toBe(override);
  });

  it('HTML nas descrições do JSON é removido antes de chegar ao motor', () => {
    // Simula o formato real do cpSkillDescData (com HTML como no browser-extract)
    (global as any).g_EsoCpSkills = { '60494': { name: 'Inspiration Boost', disciplineIndex: 0 } };
    (global as any).g_EsoCpSkillDesc = {
      '60494': {
        0: "Some <b>bold</b> text.\nCurrent bonus: <div class='esovcpDescWhite'>42</div>",
      },
    };
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 0 } },
    });
    const node = (global as any).g_EsoCpData?.['60494'];
    expect(node).toBeDefined();
    expect(node.description).not.toMatch(/<[^>]+>/);
    expect(node.description).toContain('42');
  });

  it('points acima da chave máxima disponível → floor lookup usa a maior chave', () => {
    // mock tem chaves 0, 5, 10 — points=999 deve retornar chave 10
    const node = captureNodeAfterCall('60494', 999);
    expect(node).toBeDefined();
    expect(node.description).toBe('Desc at 10 pts.');
  });
});

describe('CP node injection — nome real vs fallback', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  it('node em g_EsoCpSkills → name = nome real ("Inspiration Boost")', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 10 } },
    });
    const node = (global as any).g_EsoCpData?.['60494'];
    expect(node?.name).toBe('Inspiration Boost');
  });

  it('node AUSENTE de g_EsoCpSkills → name = "CP_<nodeId>"', () => {
    injectMockCpGlobals();
    // Node '99999' não existe nos mocks, mas tem descrição via override
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: {
        '99999': { description: 'Grants 1 Max Health per stage. Current bonus: 100' },
      },
    });
    const node = (global as any).g_EsoCpData?.['99999'];
    expect(node?.name).toBe('CP_99999');
  });
});

describe('CP node injection — estrutura de g_EsoCpData', () => {
  beforeAll(injectMockCpGlobals);
  afterEach(clearMockCpGlobals);

  it('node injetado tem isUnlocked=true e type="skill"', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 10 } },
    });
    const node = (global as any).g_EsoCpData?.['60494'];
    expect(node?.isUnlocked).toBe(true);
    expect(node?.type).toBe('skill');
  });

  it('node sem descrição resolvível NÃO é injetado em g_EsoCpData', () => {
    // g_EsoCpSkillDesc vazio + sem description + sem points → não injeta
    (global as any).g_EsoCpSkills = { '77777': { name: 'Unknown Node' } };
    (global as any).g_EsoCpSkillDesc = {};

    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '77777': {} },
    });
    const node = (global as any).g_EsoCpData?.['77777'];
    expect(node).toBeUndefined();
  });
});

describe('CP node injection — isolamento entre chamadas', () => {
  afterEach(clearMockCpGlobals);

  it('g_EsoCpData é resetado: nodes da chamada anterior não persistem', () => {
    injectMockCpGlobals();
    // Chamada A: com node CP
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: { '60494': { points: 10 } },
    });

    injectMockCpGlobals();
    // Chamada B: sem nodes CP → g_EsoCpData deve estar vazio
    calculateBuild({ character: BASE_CHAR });

    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {}).length).toBe(0);
  });

  it('championPointNodes vazio → g_EsoCpData permanece vazio', () => {
    injectMockCpGlobals();
    calculateBuild({ character: BASE_CHAR, championPointNodes: {} });
    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {}).length).toBe(0);
  });

  it('dois nodes distintos em uma mesma chamada são ambos injetados', () => {
    injectMockCpGlobals();
    calculateBuild({
      character: BASE_CHAR,
      championPointNodes: {
        '60494': { points: 50 },
        '60500': { points: 20 },
      },
    });
    const cpData = (global as any).g_EsoCpData;
    expect(cpData?.['60494']).toBeDefined();
    expect(cpData?.['60494']?.name).toBe('Inspiration Boost');
    expect(cpData?.['60500']).toBeDefined();
    expect(cpData?.['60500']?.name).toBe('Gifted Rider');
    expect(cpData?.['60500']?.description).toBe('Rider at 20 pts.');
  });
});
