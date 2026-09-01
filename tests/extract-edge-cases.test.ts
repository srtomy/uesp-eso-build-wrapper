import { describe, expect, it } from 'vitest';
import { extractGameData, loadInitData } from '../src/lib/uesp-data';

function makeDb(rows: Record<string, unknown[]>): any {
  return {
    prepare(sql: string) {
      return {
        get: () => ({ v: 50 }),
        all: () => {
          if (sql.includes('computedStats')) return rows.computedStats ?? [];
          if (sql.includes('FROM rules')) return rows.rules ?? [];
          if (sql.includes('FROM effects')) return rows.effects ?? [];
          if (sql.includes('cp2Skills')) return rows.cp2Skills ?? [];
          if (sql.includes('cp2SkillDescriptions')) return rows.cp2SkillDescriptions ?? [];
          if (sql.includes('playerSkills')) return rows.playerSkills ?? [];
          if (sql.includes('skillTree')) return rows.skillTree ?? [];
          return [];
        },
      };
    },
  };
}

describe('extractGameData', () => {
  it('loads the committed game data fixture', () => {
    const data = loadInitData();
    expect(Object.keys(data.computedStats).length).toBeGreaterThan(0);
    expect(data.buildRules).toBeDefined();
  });

  it('keeps malformed compute JSON as a string and malformed dependencies as null', () => {
    const data = extractGameData(
      makeDb({
        computedStats: [
          {
            id: 1,
            statId: 'Health',
            version: '50',
            compute: 'not-json',
            dependsOn: '[broken',
            idx: 0,
            roundNum: '',
          },
        ],
      }),
      '50',
    );

    expect(data.computedStats.Health).toMatchObject({ compute: 'not-json', depends: null });
  });

  it('groups rules and joins their effects by rule id', () => {
    const data = extractGameData(
      makeDb({
        rules: [
          { id: 1, version: '50', ruleType: 'buff', customData: '{"extra":true}' },
          { id: 2, version: '50', ruleType: 'buff', customData: '{broken' },
        ],
        effects: [{ id: 10, ruleId: 1, version: '50', statId: 'Health', value: '10' }],
      }),
      '50',
    );

    const rules = data.buildRules?.buff as Record<string, any>;
    expect(Object.keys(rules)).toEqual(['1', '2']);
    expect(rules['1']).toMatchObject({ extra: true, effects: [{ id: '10', statId: 'Health' }] });
    expect(rules['2'].effects).toEqual([]);
  });
});
