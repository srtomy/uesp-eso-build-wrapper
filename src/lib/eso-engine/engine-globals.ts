/**
 * Typed view of the globals installed by the vendored UESP engine scripts.
 *
 * The UESP engine (`esoEditBuild.js`, `esobuilddata.js`) is untyped browser
 * JavaScript: it declares `var g_Eso*` / `window.function`s that, thanks to the
 * loader's `vm.runInThisContext`, end up on Node's global scope. Accessing them
 * through this interface replaces the `(global as any)` casts used across the
 * wrapper.
 *
 * Field shapes are derived from (a) how the wrapper reads/writes each global and
 * (b) the vendored engine sources. Properties the engine reads but the wrapper
 * does not touch are deliberately absent or typed `unknown`.
 *
 * This module is internal — it is not part of the public API.
 */

import type { UespItemApiData } from './types.js';

/** One stat object in `g_EsoComputedStats`. */
export interface EngineStatEntry {
  value: number;
  preCapValue: number;
}

/** One effect entry in a buff's `effects` array. */
export interface EngineBuffEffect {
  statId?: string;
  value?: number;
  display?: string;
}

/**
 * One buff entry in `g_EsoBuildBuffData`.
 * The UESP engine creates entries and reads the flags in
 * `IsEsoBuffEnabled()` (`enabled || skillEnabled || buffEnabled || combatEnabled`).
 */
export interface EngineBuffEntry {
  enabled?: boolean;
  skillEnabled?: boolean;
  buffEnabled?: boolean;
  combatEnabled?: boolean;
  count?: number;
  maxTimes?: number;
  name?: string;
  group?: string;
  groupName?: string;
  icon?: string;
  effects?: EngineBuffEffect[];
  isToggle?: boolean;
  visible?: boolean;
  isVisible?: boolean;
}

/** `matchData` of a toggle skill entry. */
export interface EngineToggleMatch {
  displayName?: string;
  statRequireId?: string;
  baseSkillId?: unknown;
  effects?: EngineBuffEffect[];
}

/** One toggle skill entry in `g_EsoBuildToggledSkillData`. */
export interface EngineToggleEntry {
  enabled?: boolean;
  combatEnabled?: boolean;
  valid?: boolean;
  isPassive?: boolean | number;
  maxTimes?: unknown;
  matchData?: EngineToggleMatch;
}

/** One slot of a weapon/skill bar in `g_EsoSkillBarData`. */
export interface EngineBarSlot {
  skillId: number;
  origSkillId: number;
  morphIndex: number;
  slotIndex: number;
}

/**
 * One passive skill record in `g_EsoPassiveSkillSnapshot` (written by
 * loader.ts at engine init from `g_SkillsData`).
 */
export interface EnginePassiveRecord {
  abilityId: number | string;
  name: string;
  baseName: string;
  rank: number;
  maxRank: number;
  skillLine: string;
  description: string;
  icon: string;
  raceType?: string;
  classType?: string;
  nextSkill?: number | string;
}

/** One Champion Point node entry written into `g_EsoCpData`. */
export interface EngineCpEntry {
  type?: string;
  isUnlocked?: boolean;
  description?: string;
  name?: string;
}

/**
 * One contribution to an input stat, recorded by the engine in
 * `g_EsoInputStatSources` via `AddEsoInputStatSource`.
 */
export interface EngineStatSource {
  cp?: string;
  passive?: string;
  buff?: string;
  set?: string;
  item?: string;
  source?: string;
  abilityId?: number | string;
  value: number | string;
}

/**
 * Per-category input values returned by `GetEsoInputValues()`.
 * Field names match the engine's `inputValues` object.
 */
export interface EngineInputValues {
  Skill2?: Record<string, number>;
  CP?: Record<string, number>;
  Buff?: Record<string, number>;
  Skill?: Record<string, number>;
  Item?: Record<string, number>;
  Set?: Record<string, number>;
  Mundus?: Record<string, number>;
  Food?: Record<string, number>;
  SkillBonusSpellDmg?: Record<string, number>;
  SkillBonusWeaponDmg?: Record<string, number>;
  SkillLineSpellDmg?: Record<string, number>;
  SkillLineWeaponDmg?: Record<string, number>;
}

/** All engine globals the wrapper reads or writes. */
export interface UespEngineGlobals {
  g_EsoComputedStats?: Record<string, EngineStatEntry>;
  g_EsoBuildItemData: Record<string, Partial<UespItemApiData>>;
  g_EsoBuildEnchantData?: Record<string, { enchantDesc?: string; enchantName?: string }>;
  g_EsoBuildBuffData?: Record<string, EngineBuffEntry>;
  g_EsoBuildToggledSkillData?: Record<string, EngineToggleEntry>;
  g_EsoCpData: Record<string, EngineCpEntry>;
  g_EsoSkillBarData: [EngineBarSlot[], EngineBarSlot[]];
  g_EsoSkillPassiveData?: Record<string, { abilityId: number }>;
  g_EsoSkillActiveData?: Record<string, { abilityId: number }>;
  _esoWrapperTwiceBornOverride?: boolean;
  g_EsoBuildRules?: { cp?: unknown };
  g_EsoCpSkills?: Record<string, { name?: string }>;
  g_EsoCpSkillDesc?: Record<string, Record<string, string>>;
  g_EsoPassiveSkillSnapshot?: Record<string, EnginePassiveRecord>;
  g_EsoBuildActiveWeapon?: number;
  g_EsoBuildActiveAbilityBar?: number;
  UpdateEsoComputedStatsList_Real?: (keepSaveResults: null, noUpdate: boolean) => void;
  IsEsoBuildToggledSetEnabled: (setId: unknown) => boolean;
  g_EsoBuildToggledSetData?: Record<string, { valid?: boolean }>;
  GetEsoInputValues?: (mergeComputedStats: unknown) => EngineInputValues;
  g_EsoInputStatSources?: Record<string, EngineStatSource[]>;
}

/**
 * Returns the typed view of the engine globals on the current global scope.
 * Property lookups are lazy, so this is safe to call before or after the
 * engine scripts have been loaded.
 */
export function engineGlobals(): UespEngineGlobals {
  return globalThis as unknown as UespEngineGlobals;
}
