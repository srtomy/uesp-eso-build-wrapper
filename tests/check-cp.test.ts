/**
 * Smoke tests for the CP rules structure loaded by the UESP engine.
 *
 * Verifies that ESO_CPEFFECT_MATCHES contains the 84 expected rules and that
 * some key rules have the correct fields (matchRegex, effects).
 * Also confirms that g_EsoCpData starts empty after initialization.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

describe('CP rules — structure loaded by the engine', () => {
  it('ESO_CPEFFECT_MATCHES contains at least 84 rules', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES;
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThanOrEqual(84);
  });

  it('each rule has matchRegex and at least one effect', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES;
    for (const rule of matches) {
      expect(rule).toHaveProperty('matchRegex');
      expect(rule.matchRegex).toBeTruthy();
      expect(Array.isArray(rule.effects)).toBe(true);
      expect(rule.effects.length).toBeGreaterThan(0);
    }
  });

  it('rule 40814 exists and affects Magicka (Item category)', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES as any[];
    const rule = matches.find((r: any) => r.ruleId === 40814 || r.ruleId === '40814');
    expect(rule).toBeDefined();
    const magickaEffect = rule.effects.find((e: any) => e.statId === 'Magicka');
    expect(magickaEffect).toBeDefined();
    expect(magickaEffect.ruleId).toBe('40814');
  });

  it('rule 41216 exists and affects CritDamage with display="%"', () => {
    const matches = (global as any).ESO_CPEFFECT_MATCHES as any[];
    const rule = matches.find((r: any) => r.ruleId === 41216 || r.ruleId === '41216');
    expect(rule).toBeDefined();
    const critEffect = rule.effects.find((e: any) => e.statId === 'CritDamage');
    expect(critEffect).toBeDefined();
    expect(critEffect.display).toBe('%');
  });

  it('g_EsoBuildRules.cp is loaded', () => {
    const rules = (global as any).g_EsoBuildRules;
    expect(rules).toBeDefined();
    expect(rules.cp).toBeDefined();
    expect(Object.keys(rules.cp).length).toBeGreaterThanOrEqual(84);
  });

  it('g_EsoCpSkills is an object after initEsoEngineFromData()', () => {
    const cpSkills = (global as any).g_EsoCpSkills;
    expect(cpSkills).toBeDefined();
    expect(typeof cpSkills).toBe('object');
  });

  it('g_EsoCpSkillDesc is an object after initEsoEngineFromData()', () => {
    const cpSkillDesc = (global as any).g_EsoCpSkillDesc;
    expect(cpSkillDesc).toBeDefined();
    expect(typeof cpSkillDesc).toBe('object');
  });

  it('g_EsoCpSkills has node 141744 with name "Arcane Supremacy"', () => {
    const cpSkills = (global as any).g_EsoCpSkills;
    expect(cpSkills?.['141744']).toBeDefined();
    expect(cpSkills['141744'].name).toBe('Arcane Supremacy');
  });

  it('g_EsoCpSkillDesc[141744][50] contains "Current bonus:" (data loaded from JSON)', () => {
    const cpSkillDesc = (global as any).g_EsoCpSkillDesc;
    const desc50: string = cpSkillDesc?.['141744']?.['50'] ?? '';
    expect(desc50).toMatch(/Current bonus:/i);
  });

  it('g_EsoCpData starts empty (populated only during calculateBuild)', () => {
    const cpData = (global as any).g_EsoCpData;
    expect(Object.keys(cpData ?? {})).toHaveLength(0);
  });
});
