/**
 * Regression tests for the CP name alias (documented as D5).
 *
 * Some engine checks read Champion Point nodes by NAME:
 *   - Bulwark:       esoEditBuild.js:3806  (`g_EsoCpData['Bulwark']`)
 *   - Shield Expert: esoEditBuild.js:2227  (legacy block, dead code upstream)
 *
 * The UESP page creates that alias itself in esocp_simple.js:63
 * (`g_EsoCpData[skillName] = g_EsoCpData[skillId]`), so the live editor has both
 * keys for every node. The wrapper used to inject only the numeric abilityId,
 * which made Bulwark silently apply no effect. calculator.ts now mirrors the
 * alias.
 *
 * `isUnlocked` semantics (esocp_simple.js:684-720): slottable nodes
 * (skillType 1/2) are only unlocked when they sit on the Champion Bar. Without
 * an explicit `isUnlocked`, the wrapper derives false for them — matching the
 * live page (see the bulwark-not-slotted fixture).
 *
 * Numbers are locked to the vendored engine: a CP160 legendary shield with
 * armorRating 1720 contributes 1720 Spell/Physical Resistance, and Bulwark
 * adds 1900 (parsed from the node description at any point level).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { UespItemApiData } from '../src/lib/eso-engine';
import { calculateBuild, initEsoEngineFromData } from '../src/lib/eso-engine';
import { loadInitData } from '../src/lib/uesp-data';

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

const CHARACTER = {
  race: 'High Elf',
  class: 'Sorcerer',
  level: 50,
  attributes: { health: 0, magicka: 64, stamina: 0 },
} as const;

/** Minimal shield payload — only the fields the resist path reads. */
const SHIELD = {
  itemId: '197215',
  name: "Ansuul's Perfected Shield",
  level: '66',
  quality: '5',
  trait: '0',
  type: '1',
  equipType: '7',
  weaponType: '14',
  armorType: '0',
  armorRating: '1720',
  weaponPower: '0',
  setId: '0',
  setName: '',
  setBonusCount: '0',
  enchantName: '',
  enchantDesc: '',
  traitDesc: '',
} as UespItemApiData;

const BULWARK_ID = '64079';
const BULWARK_RESIST = 1900;
const SHIELD_RESIST = 1720;

type Items = Record<string, UespItemApiData>;

function run(championPointNodes?: Record<string, unknown>, items: Items = { OffHand1: SHIELD }) {
  return calculateBuild({
    character: CHARACTER,
    items,
    championPointNodes: championPointNodes as never,
  });
}

describe('CP nodes read by name (D5)', () => {
  it('exposes every injected node under its name, like the browser bootstrap', () => {
    run({ [BULWARK_ID]: { points: 50, isUnlocked: true } });

    // g_EsoCpData is reset at the start of the next call, not at the end of this one.
    const cpData = (globalThis as any).g_EsoCpData;
    expect(cpData?.['Bulwark']).toBeDefined();
    expect(cpData?.['Bulwark']).toBe(cpData?.[BULWARK_ID]); // same object, as on the page
    expect(cpData?.['Bulwark'].id).toBe(64079);
    expect(cpData?.['Bulwark'].type).toBe('skill');
  });

  it('applies Bulwark when a shield is equipped and the node is on the champion bar', () => {
    const base = run();
    expect(base.PhysicalResist).toBe(SHIELD_RESIST);

    const withBulwark = run({ [BULWARK_ID]: { points: 50, isUnlocked: true } });

    expect(withBulwark.PhysicalResist - base.PhysicalResist).toBe(BULWARK_RESIST);
    expect(withBulwark.SpellResist - base.SpellResist).toBe(BULWARK_RESIST);
  });

  it('does not double-count: the numeric key and the name key are one entry', () => {
    // A double application would yield 2x1900; the rule loops skip non-numeric keys.
    const withBulwark = run({ [BULWARK_ID]: { points: 50, isUnlocked: true } });
    expect(withBulwark.PhysicalResist).toBe(SHIELD_RESIST + BULWARK_RESIST);
  });

  it('keeps slottable nodes locked unless isUnlocked is explicit (champion-bar parity)', () => {
    const base = run();
    const investedOnly = run({ [BULWARK_ID]: { points: 50 } });

    expect(investedOnly.PhysicalResist).toBe(base.PhysicalResist);
    expect((globalThis as any).g_EsoCpData?.['Bulwark']?.isUnlocked).toBe(false);
  });

  it('accepts the node keyed by name in the input and still applies it', () => {
    const base = run();
    const byName = run({ Bulwark: { points: 50, isUnlocked: true } });

    expect(byName.PhysicalResist - base.PhysicalResist).toBe(BULWARK_RESIST);
    expect((globalThis as any).g_EsoCpData?.[BULWARK_ID]).toBe(
      (globalThis as any).g_EsoCpData?.['Bulwark'],
    );
  });

  it('applies no bonus without a shield or frost staff equipped', () => {
    const base = run(undefined, {});
    const unlocked = run({ [BULWARK_ID]: { points: 50, isUnlocked: true } }, {});

    expect(unlocked.PhysicalResist).toBe(base.PhysicalResist);
    expect(unlocked.SpellResist).toBe(base.SpellResist);
  });

  it('applies Bulwark for a frost staff on the main hand (weaponType 13)', () => {
    const staff = { ...SHIELD, weaponType: '13', name: 'Frost Staff' };
    const base = run(undefined, { MainHand1: staff });
    const unlocked = run({ [BULWARK_ID]: { points: 50, isUnlocked: true } }, { MainHand1: staff });

    expect(unlocked.PhysicalResist - base.PhysicalResist).toBe(BULWARK_RESIST);
    expect(unlocked.SpellResist - base.SpellResist).toBe(BULWARK_RESIST);
  });
});
