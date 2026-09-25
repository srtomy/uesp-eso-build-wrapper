import { describe, expect, it } from 'vitest';
import type { EngineToggledSetEntry } from '../src/lib/eso-engine/engine-globals';
import { collectSetToggles } from '../src/lib/eso-engine/set-toggles';

describe('collectSetToggles', () => {
  it('returns an empty list when there is no toggle data', () => {
    expect(collectSetToggles({})).toEqual([]);
  });

  it('returns an empty list when the toggle data is undefined', () => {
    expect(collectSetToggles(undefined)).toEqual([]);
  });

  it('keeps only valid entries; each description is the part its rule matches', () => {
    // As duas rules de Ansuul compartilham a MESMA linha de bônus — a descrição
    // específica sai do trecho que a regex de cada rule casa.
    const desc =
      '(5 items) Increases your damage done against monsters by 7%. When you interrupt an enemy, you increase your damage done against monsters by an additional 7% for 10 seconds.';

    const data: Record<string, EngineToggledSetEntry> = {
      "Ansuul's Torment": {
        valid: true,
        setId: "Ansuul's Torment",
        displayName: '',
        desc,
        matchData: { match: /Increases your damage done against monsters by ([0-9]+)%/i },
      },
      "Ansuul's Torment (Bonus Damage)": {
        valid: true,
        setId: "Ansuul's Torment",
        displayName: 'Bonus Damage',
        desc,
        matchData: {
          match:
            /When you interrupt an enemy, you increase your damage done against monsters by an additional ([0-9]+)% for [0-9]+ seconds/i,
        },
      },
      'Spectral Cloak': { valid: false, setId: 'Spectral Cloak' },
      'Never Computed': {},
    };

    expect(collectSetToggles(data)).toEqual([
      {
        id: "Ansuul's Torment",
        setId: "Ansuul's Torment",
        label: "Ansuul's Torment",
        description: 'Increases your damage done against monsters by 7%',
        minTimes: 0,
        maxTimes: null,
        count: 0,
      },
      {
        id: "Ansuul's Torment (Bonus Damage)",
        setId: "Ansuul's Torment",
        label: 'Bonus Damage',
        description:
          'When you interrupt an enemy, you increase your damage done against monsters by an additional 7% for 10 seconds',
        minTimes: 0,
        maxTimes: null,
        count: 0,
      },
    ]);
  });

  it('falls back to the full desc / rule id when fields are missing', () => {
    const data: Record<string, EngineToggledSetEntry> = {
      'Ring of the Wild Hunt': { valid: true },
      'No Match': { valid: true, desc: 'Full bonus line.', matchData: { match: /nope/i } },
      'Empty Desc': { valid: true, desc: '', matchData: { match: /./ } },
    };

    expect(collectSetToggles(data)).toEqual([
      {
        id: 'Ring of the Wild Hunt',
        setId: 'Ring of the Wild Hunt',
        label: 'Ring of the Wild Hunt',
        description: '',
        minTimes: 0,
        maxTimes: null,
        count: 0,
      },
      {
        id: 'No Match',
        setId: 'No Match',
        label: 'No Match',
        description: 'Full bonus line.',
        minTimes: 0,
        maxTimes: null,
        count: 0,
      },
      {
        id: 'Empty Desc',
        setId: 'Empty Desc',
        label: 'Empty Desc',
        description: '',
        minTimes: 0,
        maxTimes: null,
        count: 0,
      },
    ]);
  });

  it('exposes the stack range and the current count for stacking toggles', () => {
    const data: Record<string, EngineToggledSetEntry> = {
      "Sergeant's Mail": {
        valid: true,
        desc: 'Increases the damage of your Heavy Attacks by 119 per stack.',
        minTimes: 0,
        maxTimes: 4,
        count: 3,
      },
    };

    expect(collectSetToggles(data)).toEqual([
      {
        id: "Sergeant's Mail",
        setId: "Sergeant's Mail",
        label: "Sergeant's Mail",
        description: 'Increases the damage of your Heavy Attacks by 119 per stack.',
        minTimes: 0,
        maxTimes: 4,
        count: 3,
      },
    ]);
  });
});
