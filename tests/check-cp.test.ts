/**
 * Smoke tests para a estrutura de CP rules carregada pelo motor da UESP.
 *
 * Verifica que ESO_CPEFFECT_MATCHES contém as 84 regras esperadas e que
 * algumas regras-chave têm os campos corretos (matchRegex, effects).
 * Também confirma que g_EsoCpData começa vazio após a inicialização.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import path from 'path';
import { initEsoEngine } from '../src/lib/eso-engine';

beforeAll(() => {
  initEsoEngine(
    path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
    path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
  );
});

describe('CP rules — estrutura carregada pelo motor', () => {
  it('ESO_CPEFFECT_MATCHES contém pelo menos 84 regras', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES;
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThanOrEqual(84);
  });

  it('cada regra tem matchRegex e ao menos um efeito', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES;
    for (const rule of matches) {
      expect(rule).toHaveProperty('matchRegex');
      expect(rule.matchRegex).toBeTruthy();
      expect(Array.isArray(rule.effects)).toBe(true);
      expect(rule.effects.length).toBeGreaterThan(0);
    }
  });

  it('regra 38750 existe e afeta Magicka (categoria Item)', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES as any[];
    const rule = matches.find((r: any) => r.ruleId === 38750 || r.ruleId === '38750');
    expect(rule).toBeDefined();
    const magickaEffect = rule.effects.find((e: any) => e.statId === 'Magicka');
    expect(magickaEffect).toBeDefined();
    expect(magickaEffect.ruleId).toBe('38750');
  });

  it('regra 39152 existe e afeta CritDamage com display="%"', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES as any[];
    const rule = matches.find((r: any) => r.ruleId === 39152 || r.ruleId === '39152');
    expect(rule).toBeDefined();
    const critEffect = rule.effects.find((e: any) => e.statId === 'CritDamage');
    expect(critEffect).toBeDefined();
    expect(critEffect.display).toBe('%');
  });

  it('g_EsoBuildRules.cp está carregado', () => {
    const rules = (global as any).g_EsoBuildRules;
    expect(rules).toBeDefined();
    expect(rules.cp).toBeDefined();
    expect(Object.keys(rules.cp).length).toBeGreaterThanOrEqual(84);
  });

  it('g_EsoCpSkills é um objeto após initEsoEngine()', () => {
    const cpSkills = (global as any).g_EsoCpSkills;
    expect(cpSkills).toBeDefined();
    expect(typeof cpSkills).toBe('object');
  });

  it('g_EsoCpSkillDesc é um objeto após initEsoEngine()', () => {
    const cpSkillDesc = (global as any).g_EsoCpSkillDesc;
    expect(cpSkillDesc).toBeDefined();
    expect(typeof cpSkillDesc).toBe('object');
  });

  it('g_EsoCpSkills tem o node 141744 com name "Arcane Supremacy"', () => {
    const cpSkills = (global as any).g_EsoCpSkills;
    expect(cpSkills?.['141744']).toBeDefined();
    expect(cpSkills['141744'].name).toBe('Arcane Supremacy');
  });

  it('g_EsoCpSkillDesc[141744][50] contém "Current bonus:" (dados carregados do JSON)', () => {
    const cpSkillDesc = (global as any).g_EsoCpSkillDesc;
    const desc50: string = cpSkillDesc?.['141744']?.['50'] ?? '';
    expect(desc50).toMatch(/Current bonus:/i);
  });

  it('g_EsoCpData começa vazio (preenchido apenas durante calculateBuild)', () => {
    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {}).length).toBe(0);
  });
});
