import { describe, expect, it } from 'vitest';
import type { EngineToggledSetEntry } from '../src/lib/eso-engine/engine-globals';
import { collectSetToggles } from '../src/lib/eso-engine/set-toggles';

describe('collectSetToggles', () => {
  it('returns an empty list when there is no toggle data', () => {
    expect(collectSetToggles({})).toEqual([]);
  });

  it('keeps only valid entries and flattens them to { id, setId, label, description }', () => {
    const data: Record<string, EngineToggledSetEntry> = {
      "Ansuul's Torment": {
        valid: true,
        setId: "Ansuul's Torment",
        displayName: '',
        desc: '(5 items) Increases your damage done against monsters by 7%.',
      },
      "Ansuul's Torment (Bonus Damage)": {
        valid: true,
        setId: "Ansuul's Torment",
        displayName: 'Bonus Damage',
        desc: '(5 items) When you interrupt an enemy, ...',
      },
      'Spectral Cloak': { valid: false, setId: 'Spectral Cloak' },
      'Never Computed': {},
    };

    expect(collectSetToggles(data)).toEqual([
      {
        id: "Ansuul's Torment",
        setId: "Ansuul's Torment",
        label: "Ansuul's Torment",
        description: '(5 items) Increases your damage done against monsters by 7%.',
      },
      {
        id: "Ansuul's Torment (Bonus Damage)",
        setId: "Ansuul's Torment",
        label: 'Bonus Damage',
        description: '(5 items) When you interrupt an enemy, ...',
      },
    ]);
  });

  it('falls back to the rule id and an empty description when fields are missing', () => {
    const data: Record<string, EngineToggledSetEntry> = {
      'Ring of the Wild Hunt': { valid: true },
    };

    expect(collectSetToggles(data)).toEqual([
      {
        id: 'Ring of the Wild Hunt',
        setId: 'Ring of the Wild Hunt',
        label: 'Ring of the Wild Hunt',
        description: '',
      },
    ]);
  });
});
