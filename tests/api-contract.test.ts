import { describe, expect, it } from 'vitest';
import type { BuildInput, ComputedStats, UespInitData } from '../src/lib/eso-engine';
import * as api from '../src/lib/eso-engine';

const buildInput: BuildInput = {
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
    mundusStone: 'The Thief',
    mundusStone2: 'The Apprentice',
    cyrodiil: false,
    vampireStage: 0,
    werewolfStage: 0,
    championPoints: 160,
    rulesVersion: 'Live',
  },
  items: {},
  championPointNodes: {},
  activeBuffs: [],
  toggleSkills: [],
  skillBars: { bar1: [], bar2: [] },
  activeWeaponBar: 1,
  passiveSkills: [],
  autoPassives: true,
  enchantOverrides: {},
  toggledSetBonuses: [],
};

const initData: UespInitData = { computedStats: {} };
const computedStats: ComputedStats = {
  Health: 0,
  Magicka: 0,
  Stamina: 0,
  HealthRegen: 0,
  MagickaRegen: 0,
  StaminaRegen: 0,
  WeaponDamage: 0,
  SpellDamage: 0,
  WeaponCrit: 0,
  SpellCrit: 0,
  SpellCritDamage: 0,
  WeaponCritDamage: 0,
  PhysicalResist: 0,
  SpellResist: 0,
  CritResist: 0,
  PhysicalPenetration: 0,
  SpellPenetration: 0,
  EffectiveSpellPower: 0,
  EffectiveWeaponPower: 0,
  EffectivePower: 0,
  HealingDone: 0,
  HealingTaken: 0,
  RunSpeed: 0,
  SprintSpeed: 0,
  AttackSpellMitigation: 0,
  AttackPhysicalMitigation: 0,
  DefenseSpellMitigation: 0,
  DefensePhysicalMitigation: 0,
  raw: {},
};

describe('public API contract', () => {
  it('exports the documented runtime entry points', () => {
    expect(api).toEqual(
      expect.objectContaining({
        calculateBuild: expect.any(Function),
        initEsoEngineFromData: expect.any(Function),
        debugBuild: expect.any(Function),
        listAvailableBuffs: expect.any(Function),
        listRacialPassives: expect.any(Function),
        listClassPassives: expect.any(Function),
        listPassivesBySkillLine: expect.any(Function),
        listAvailableSkillLines: expect.any(Function),
        listAvailableToggleSkills: expect.any(Function),
      }),
    );
  });

  it('keeps representative public input and output shapes type-safe', () => {
    expect(buildInput.character.race).toBe('High Elf');
    expect(initData.computedStats).toEqual({});
    expect(computedStats.raw).toEqual({});
  });
});
