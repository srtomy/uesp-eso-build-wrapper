/**
 * ESO build calculation engine.
 *
 * Implements the core architecture idea:
 *
 *   1. Inject character data into the mock DOM elements
 *      (jQuery will read via $("#esotbRace").val(), etc.)
 *
 *   2. Inject item data DIRECTLY into g_EsoBuildItemData[slot]
 *      — no need to mock jQuery for each item field.
 *      Fields come exactly in the UESP public API format:
 *      GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
 *
 *   3. Call UpdateEsoComputedStatsList_Real(null, true)
 *      — the `noUpdate=true` parameter makes the engine compute everything but skip
 *      the DOM updates (DisplayEsoAllComputedStats, UpdateReadOnlyStats, etc.)
 *
 *   4. Read the results from g_EsoComputedStats[statId].value
 */

import { resetDomValues, setDomAttr, setDomTextContent, setDomValue } from './env-setup.js';
import { engineGlobals } from './engine-globals.js';
import type { EnginePassiveRecord, EngineStatEntry } from './engine-globals.js';
import type {
  BuffInfo,
  BuildInput,
  ChampionPointNode,
  ComputedStats,
  EquipSlot,
  PassiveSkillInfo,
  SkillSlot,
  ToggleSkillInfo,
  UespItemApiData,
} from './types.js';

// Stat object cache — populated once after initEsoEngineFromData.
// Avoids Object.keys/values on every calculateBuild; ~200 objects.
let _statObjects: EngineStatEntry[] | null = null;

export function cacheStatObjects(): void {
  const stats = engineGlobals().g_EsoComputedStats;
  if (stats && typeof stats === 'object') {
    _statObjects = Object.values(stats);
  }
}

const ALL_SLOTS: EquipSlot[] = [
  'Head',
  'Shoulders',
  'Chest',
  'Hands',
  'Legs',
  'Waist',
  'Feet',
  'Neck',
  'Ring1',
  'Ring2',
  'MainHand1',
  'OffHand1',
  'MainHand2',
  'OffHand2',
  'Poison1',
  'Poison2',
  'Food',
  'Potion',
];

/**
 * Normalizes an item's data ensuring all optional fields
 * exist with safe defaults. Without this, the engine throws a TypeError when trying
 * to call .includes() on undefined set bonus fields (setBonusDesc5..12).
 */
function normalizeItemData(item: UespItemApiData): UespItemApiData {
  const defaults: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) {
    defaults[`setBonusCount${i}`] = item[`setBonusCount${i}`] ?? '-1';
    defaults[`setBonusDesc${i}`] = item[`setBonusDesc${i}`] ?? '';
  }
  return { ...defaults, ...item };
}

/**
 * Calculates the Computed Character Statistics for the given build.
 *
 * Each call starts from a clean engine state (previous items, buffs, CP nodes
 * and skill bars are reset), so builds never bleed into each other.
 *
 * @param input - The build to calculate: character sheet, items, champion
 *   point nodes, buffs, toggle skills, skill bars and passives.
 * @returns All computed stats — named keys (Health, Magicka, SpellDamage, ...)
 *   plus `raw` with the full 221-stat `g_EsoComputedStats` record.
 * @throws If the engine has not been initialized with
 *   `initEsoEngineFromData()` first.
 *
 * @example
 * ```ts
 * import { calculateBuild } from 'uesp-eso-build-wrapper';
 *
 * const stats = calculateBuild({
 *   character: { race: 'High Elf', class: 'Sorcerer', level: 50,
 *                attributes: { health: 0, magicka: 64, stamina: 0 } },
 *   items: {
 *     Chest: chestItemFromUespApi,  // object returned by esolog.uesp.net/exportJson.php
 *   },
 * });
 * console.log(stats.Magicka, stats.SpellDamage);
 * ```
 */
export function calculateBuild(input: BuildInput): ComputedStats {
  const {
    character,
    items,
    championPointNodes,
    activeBuffs,
    toggleSkills,
    skillBars,
    activeWeaponBar,
    passiveSkills,
    autoPassives,
    enchantOverrides,
    toggledSetBonuses,
  } = input;

  // ─── GLOBAL STATE RESET ───────────────────────────────────────────────────
  // All resets in one place — makes leaks between calls easier to spot.

  // g_EsoComputedStats: zero value/preCapValue before computing.
  // In the browser they all start at 0 on every load; in the wrapper the object persists
  // across calls and stats from a previous build contaminate the next one. The deferred loop
  // (esoEditBuild.js:4397) copies g_EsoComputedStats[name].value back into
  // inputValues[name] at each step j, so a leftover value corrupts early-computed
  // stats (e.g. BashDamage). _statObjects is populated once at init,
  // avoiding Object.keys on every call.
  if (_statObjects) {
    for (const stat of _statObjects) {
      stat.value = 0;
      stat.preCapValue = 0;
    }
  }

  const g = engineGlobals();

  const itemData = g.g_EsoBuildItemData;
  const enchantData = g.g_EsoBuildEnchantData;
  const buffData = g.g_EsoBuildBuffData;
  const toggleSkillData = g.g_EsoBuildToggledSkillData;

  const emptyBar = () =>
    Array.from({ length: 6 }, (_, i) => ({
      skillId: 0,
      origSkillId: 0,
      morphIndex: 0,
      slotIndex: i,
    }));

  // Items and enchantments
  for (const slot of ALL_SLOTS) {
    itemData[slot] = {};
    if (enchantData) enchantData[slot] = {};
  }

  // Champion Points
  g.g_EsoCpData = {};

  // Buffs: zero activation flags and counters (avoids stack bleed like Arcanist Crux)
  if (buffData && typeof buffData === 'object') {
    for (const key of Object.keys(buffData)) {
      const b = buffData[key];
      if (b && typeof b === 'object') {
        b.enabled = false;
        b.skillEnabled = false;
        b.buffEnabled = false;
        b.combatEnabled = false;
        if (b.maxTimes != null && b.count == null) b.count = 0;
      }
    }
  }

  // Toggle skills: zero enabled AND valid (valid stayed true from previous calls)
  if (toggleSkillData && typeof toggleSkillData === 'object') {
    for (const key of Object.keys(toggleSkillData)) {
      const s = toggleSkillData[key];
      if (s && typeof s === 'object') {
        s.enabled = false;
        s.combatEnabled = false;
        s.valid = false;
      }
    }
  }

  // Skill bars and passives/actives
  g.g_EsoSkillBarData = [emptyBar(), emptyBar()];
  g.g_EsoSkillPassiveData = {};
  g.g_EsoSkillActiveData = {};

  // ─── DATA INJECTION ───────────────────────────────────────────────────────

  // -------------------------------------------------------------------------
  // STEP 1: Inject character stats into the mock DOM elements.
  // The engine reads these values via jQuery: $("#esotbRace").val(), etc.
  // -------------------------------------------------------------------------
  resetDomValues();

  setDomValue('esotbRace', character.race);
  setDomValue('esotbClass', character.class);
  setDomValue('esotbLevel', String(Math.min(character.level, 50)));
  setDomValue('esotbAttrHea', String(character.attributes.health ?? 0));
  setDomValue('esotbAttrMag', String(character.attributes.magicka ?? 0));
  setDomValue('esotbAttrSta', String(character.attributes.stamina ?? 0));

  // Mundus Stone
  if (character.mundusStone) {
    setDomValue('esotbMundus', character.mundusStone);
  }
  // Second Mundus Stone (requires the Twice-Born Star set or it is enabled directly).
  // IsTwiceBornStarEnabled() reads the _esoWrapperTwiceBornOverride flag (patch in loader.ts)
  // when the set is not equipped but mundusStone2 is provided explicitly.
  g._esoWrapperTwiceBornOverride = !!character.mundusStone2;
  if (character.mundusStone2) {
    setDomValue('esotbMundus2', character.mundusStone2);
  }

  // PvP Cyrodiil (Battle Spirit)
  if (character.cyrodiil) {
    setDomValue('esotbCyrodiil', 'true'); // prop("checked") returns true when the value is "true"
  }

  // Vampire / Werewolf
  if (character.vampireStage != null)
    setDomValue('esotbVampireStage', String(character.vampireStage));
  if (character.werewolfStage != null)
    setDomValue('esotbWerewolfStage', String(character.werewolfStage));

  // Champion Points (default 0 — ensures SpellCrit and WeaponCrit stay numeric)
  setDomValue('esotbCPTotalPoints', String(character.championPoints ?? 0));

  // Rules version (default: Live)
  setDomValue('esotbRulesVersion', character.rulesVersion ?? 'Live');

  // Required fields with safe defaults
  setDomValue('esotbMountSpeedBonus', '0');
  setDomValue('esotbBaseWalkSpeed', '3.0');
  setDomValue('esotbBuildDescription', '');
  setDomValue('esotbUsePtsRules', 'false');
  setDomValue('esotbEnableRaceAutoPurchase', 'false');

  // Target configuration — required for AttackSpellMitigation and EffectivePower.
  // Target.EffectiveLevel = 0 causes a division by zero in the formula; 50 is the max level default.
  setDomValue('esotbTargetResistance', '18200'); // UESP default: CP160 enemy base resistance
  setDomValue('esotbTargetEffectiveLevel', '66'); // UESP default: 66 = CP160 (endgame content)
  setDomValue('esotbTargetCritResistFlat', '0');
  setDomValue('esotbTargetPenetrationFlat', '0');
  setDomValue('esotbTargetPenetrationFactor', '0');
  setDomValue('esotbTargetDefenseBonus', '0');
  setDomValue('esotbTargetAttackBonus', '0');
  setDomValue('esotbTargetCritDamage', '0');
  setDomValue('esotbTargetCritChance', '0');
  setDomValue('esotbTargetPercentHealth', '100');

  // -------------------------------------------------------------------------
  // STEP 2: Inject item data DIRECTLY into g_EsoBuildItemData[slot].
  //
  // This is the core idea: instead of mocking jQuery for each item field,
  // we populate the global variable the engine reads natively.
  // Data comes exactly in the UESP public API format — no adaptation.
  // -------------------------------------------------------------------------

  // Custom enchantments: make GetEsoEnchantData() take the isDefaultEnchant=false path,
  // applying the 0.4044 factor for small slots (Hands/Waist/Feet/Shoulders).
  if (enchantData && enchantOverrides) {
    for (const slot of ALL_SLOTS) {
      const override = enchantOverrides[slot];
      if (override) enchantData[slot] = { ...override };
    }
  }

  const cpDataGlobal = g.g_EsoCpData;

  // Inject the provided items (normalized with safe defaults)
  if (items) {
    for (const [slot, item] of Object.entries(items) as [
      EquipSlot,
      UespItemApiData | undefined,
    ][]) {
      if (item && item.itemId) {
        itemData[slot] = normalizeItemData(item);
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3a: Inject Champion Points 2 nodes.
  //
  // Two paths depending on whether buildRules.cp is loaded:
  //
  // New (preferred): when g_EsoBuildRules['cp'] exists, the engine uses the
  //   GetEsoBuildCpRuleValues path which reads cpData.description and matches against
  //   ESO_CPEFFECT_MATCHES. We populate g_EsoCpData[nodeId] with the full description.
  //
  // Legacy: without cp rules, the engine uses ParseEsoCP2Value with DOM injection via
  //   $("#skill_<id>").attr("unlocked") and $("#descskill_<id>").text().
  // -------------------------------------------------------------------------
  if (championPointNodes && Object.keys(championPointNodes).length > 0) {
    setDomValue('esotbEnableCP', 'true');
    const hasCpRules = !!g.g_EsoBuildRules?.cp;
    const cpSkills = g.g_EsoCpSkills ?? {};
    const cpSkillDesc = g.g_EsoCpSkillDesc ?? {};

    // Build reverse map: name → numeric nodeId (for named-string keys in the input)
    const cpNameToId: Record<string, string> = {};
    for (const [id, meta] of Object.entries(cpSkills)) {
      const n = meta.name;
      if (n) cpNameToId[n] = id;
    }

    // Deduplicate: if the same node appears as both numeric ID and name, keep one entry.
    // We process using the resolved numeric ID so g_EsoCpData has consistent keys.
    const resolvedNodes = new Map<string, ChampionPointNode>();
    for (const [nodeId, nodeData] of Object.entries(championPointNodes)) {
      const isNumeric = /^\d+$/.test(nodeId);
      const numericId = isNumeric ? nodeId : (cpNameToId[nodeId] ?? nodeId);
      // Later entries (e.g. named key after numeric) overwrite — numeric is preferred
      if (!resolvedNodes.has(numericId) || isNumeric) {
        resolvedNodes.set(numericId, nodeData);
      }
    }

    for (const [nodeId, nodeData] of resolvedNodes) {
      if (hasCpRules) {
        // Resolve the name from the metadata captured from the browser.
        const name = cpSkills[nodeId]?.name ?? `CP_${nodeId}`;

        // Resolve the description dynamically:
        //   1. Explicit caller override
        //   2. Exact lookup by nodeData.points in g_EsoCpSkillDesc[nodeId]
        //   3. Floor lookup: largest available key ≤ points
        //   4. Fallback: key 0 or first available
        let desc: string | undefined = nodeData.description;
        if (!desc && cpSkillDesc[nodeId]) {
          const nodeDescMap: Record<string, string> = cpSkillDesc[nodeId];
          const points = nodeData.points;
          if (points !== undefined) {
            desc = nodeDescMap[String(points)];
            if (!desc) {
              // floor lookup: largest key ≤ points
              const floorKey = Object.keys(nodeDescMap)
                .map(Number)
                .filter((p) => p <= points)
                .sort((a, b) => b - a)[0];
              if (floorKey !== undefined) desc = nodeDescMap[String(floorKey)];
            }
          }
          if (!desc) {
            desc = nodeDescMap[0] ?? nodeDescMap['0'] ?? (Object.values(nodeDescMap)[0] as string);
          }
        }

        if (desc) {
          // Strip HTML tags and ESO color codes (|cHHHHHH...|r) so the engine's regex matching works on plain text
          const plainDesc = desc.replace(/<[^>]+>/g, '').replace(/\|c[0-9a-fA-F]{6}|\|r/g, '');
          // isUnlocked: use explicit value from fixture when present; default true for old fixtures without it
          const isUnlocked = nodeData.isUnlocked !== undefined ? nodeData.isUnlocked : true;
          cpDataGlobal[nodeId] = { type: 'skill', isUnlocked, description: plainDesc, name };
        }
        // no resolvable description → node ignored (no engine effect)
      } else {
        // legacy path: DOM injection for ParseEsoCP2Value
        const bonus = nodeData.currentBonus;
        const bonusStr =
          typeof bonus === 'string' && bonus.endsWith('%')
            ? `Current value: ${bonus}`
            : `Current bonus: ${bonus}`;
        setDomAttr(`skill_${nodeId}`, 'unlocked', '1');
        setDomTextContent(`descskill_${nodeId}`, bonusStr);
        setDomTextContent(`descskill_${nodeId}_prev`, `CP Node ${nodeId}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3b: Enable active buffs.
  //
  // g_EsoBuildBuffData is a Proxy that auto-creates entries.
  // Setting .enabled = true is enough for IsEsoBuffEnabled() to return true.
  // (reset already done in the global reset block above)
  // -------------------------------------------------------------------------
  if (activeBuffs) {
    for (const buffName of activeBuffs) {
      if (buffData) {
        buffData[buffName].enabled = true;
        // CountEsoMajorMinorBuffs reads .name — set it here since
        // CreateEsoBuildBuffHtml (browser-only) normally does this.
        if (!buffData[buffName].name) {
          buffData[buffName].name = buffName;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3c: Enable toggle skills.
  //
  // IsEsoBuildToggledSkillEnabled() checks: skillData.valid && skillData.enabled
  // (reset of enabled, combatEnabled and valid already done in the global reset block above)
  // -------------------------------------------------------------------------
  if (toggleSkills) {
    for (const skillName of toggleSkills) {
      if (toggleSkillData) {
        if (!toggleSkillData[skillName]) toggleSkillData[skillName] = {};
        toggleSkillData[skillName].valid = true;
        toggleSkillData[skillName].enabled = true;
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3d: Inject skill bars into g_EsoSkillBarData.
  //
  // The engine uses g_EsoSkillBarData to detect active skill lines and apply
  // conditional passives (e.g. Destruction Staff passives, set bonuses affecting
  // "Class abilities", etc.).
  //
  // CURRENT LIMITATION: without g_SkillsData in uesp-init-data.json, skill IDs are
  // injected but skill line passives produce no stats. It becomes functional
  // once g_SkillsData is added to the extraction JSON.
  // (g_EsoSkillBarData already initialized with empty bars in the reset block above)
  // -------------------------------------------------------------------------
  if (skillBars) {
    const barMap: [SkillSlot[] | undefined, 0 | 1][] = [
      [skillBars.bar1, 0],
      [skillBars.bar2, 1],
    ];
    for (const [slots, barIndex] of barMap) {
      if (!slots) continue;
      slots.slice(0, 6).forEach((slot, slotIndex) => {
        g.g_EsoSkillBarData[barIndex][slotIndex] = {
          skillId: slot.skillId,
          origSkillId: slot.skillId,
          morphIndex: slot.morphIndex ?? 0,
          slotIndex,
        };
      });
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3d-2: Populate g_EsoSkillPassiveData with the character's passives.
  //
  // The engine iterates g_EsoSkillPassiveData in GetEsoInputSkillPassives and applies
  // each passive via regex on the description text (ESO_PASSIVEEFFECT_MATCHES).
  // Requires g_SkillsData + GetEsoSkillDescription (from esoskills.js).
  //
  // Each entry: { abilityId } — the engine looks up g_SkillsData[abilityId] to
  // get coefficients and generate the passive description.
  // (g_EsoSkillPassiveData already zeroed in the reset block above)
  // -------------------------------------------------------------------------
  const allPassiveIds = new Set<number>(passiveSkills ?? []);
  if (autoPassives) {
    // Use the loader snapshot (written before any calculations) to avoid raceType mutation.
    const snapshot = g.g_EsoPassiveSkillSnapshot;
    if (snapshot) {
      for (const v of Object.values(snapshot)) {
        if (!v) continue;
        if (v.raceType === character.race && (v.nextSkill === -1 || String(v.nextSkill) === '-1')) {
          allPassiveIds.add(Number(v.abilityId));
        }
      }
    }
  }
  if (allPassiveIds.size > 0) {
    const passiveData: Record<string, { abilityId: number }> = {};
    for (const abilityId of allPassiveIds) {
      passiveData[String(abilityId)] = { abilityId };
    }
    g.g_EsoSkillPassiveData = passiveData;
  }

  // -------------------------------------------------------------------------
  // STEP 3d-3: Populate g_EsoSkillActiveData from the skill bars.
  //
  // GetEsoInputSkillActiveBar reads g_EsoSkillBarData[bar][slot].origSkillId and
  // looks up g_EsoSkillActiveData[origSkillId].abilityId for the description.
  // We populate automatically for every non-empty bar slot.
  // (g_EsoSkillActiveData already zeroed in the reset block above)
  // -------------------------------------------------------------------------
  if (skillBars) {
    const activeData: Record<string, { abilityId: number }> = {};
    const bars = [skillBars.bar1, skillBars.bar2];
    for (const bar of bars) {
      if (!bar) continue;
      for (const slot of bar) {
        if (slot.skillId) {
          // skillId = origSkillId (chave base usada por GetEsoInputSkillActiveBar)
          // morphSkillId = ID do morph atual → abilityId para GetEsoSkillDescription
          activeData[slot.skillId] = { abilityId: slot.morphSkillId ?? slot.skillId };
        }
      }
    }
    g.g_EsoSkillActiveData = activeData;
  }

  // -------------------------------------------------------------------------
  // STEP 3e: Set which weapon/skill bar is active.
  //
  // g_EsoBuildActiveWeapon  — active MainHand/OffHand slots for set bonuses.
  // g_EsoBuildActiveAbilityBar — 1-based index read by CountEsoBarSkillsWithSkillLine/Type
  //   for passives scaling with slotted skills (Expert Mage, Magicka Controller, etc.).
  // Both must be kept in sync; distinct values produce wrong passives.
  // -------------------------------------------------------------------------
  const activeBar = activeWeaponBar ?? 1;
  g.g_EsoBuildActiveWeapon = activeBar;
  g.g_EsoBuildActiveAbilityBar = activeBar;

  // -------------------------------------------------------------------------
  // STEP 4: Run the calculation.
  //
  // UpdateEsoComputedStatsList_Real(keepSaveResults, noUpdate)
  //   - keepSaveResults = null  → resets saved results (default behavior)
  //   - noUpdate = true         → skips DisplayEsoAllComputedStats and UpdateReadOnlyStats
  //                               (DOM operations we don't need)
  // -------------------------------------------------------------------------
  const updateFn = g.UpdateEsoComputedStatsList_Real;
  if (typeof updateFn !== 'function') {
    throw new Error(
      '[eso-engine] UpdateEsoComputedStatsList_Real is not available. ' +
        'Make sure to call initEsoEngineFromData() before calculateBuild().',
    );
  }

  // Patch IsEsoBuildToggledSetEnabled to honour toggledSetBonuses.
  // The UESP engine reads this inside GetEsoInputSetValues (called after UpdateEsoItemSets
  // sets valid=true for equipped sets). Without this patch, toggle set bonuses are never
  // enabled in Node because the DOM checkboxes used by UpdateEsoBuildToggledSetData are empty.
  const toggledSetIds = new Set(toggledSetBonuses ?? []);
  const origIsEnabled = g.IsEsoBuildToggledSetEnabled;
  if (toggledSetIds.size > 0) {
    g.IsEsoBuildToggledSetEnabled = function (setId: unknown) {
      if (toggledSetIds.has(String(setId))) {
        const td = g.g_EsoBuildToggledSetData?.[String(setId)];
        if (td?.valid) return true;
      }
      return origIsEnabled.call(this, setId);
    };
  }

  try {
    updateFn(null, true);
  } finally {
    if (toggledSetIds.size > 0) {
      g.IsEsoBuildToggledSetEnabled = origIsEnabled;
    }
  }

  // -------------------------------------------------------------------------
  // STEP 5: Read the results from g_EsoComputedStats[statId].value
  // -------------------------------------------------------------------------
  const computedStats = g.g_EsoComputedStats ?? {};
  const raw: Record<string, number> = {};

  for (const statId of Object.keys(computedStats)) {
    const stat = computedStats[statId];
    if (stat && typeof stat === 'object' && typeof stat.value === 'number') {
      raw[statId] = stat.value;
    }
  }

  return {
    // Max attributes
    Health: raw['Health'] ?? 0,
    Magicka: raw['Magicka'] ?? 0,
    Stamina: raw['Stamina'] ?? 0,

    // Regeneration
    HealthRegen: raw['HealthRegen'] ?? 0,
    MagickaRegen: raw['MagickaRegen'] ?? 0,
    StaminaRegen: raw['StaminaRegen'] ?? 0,

    // Damage
    WeaponDamage: raw['WeaponDamage'] ?? 0,
    SpellDamage: raw['SpellDamage'] ?? 0,

    // Critical
    WeaponCrit: raw['WeaponCrit'] ?? 0,
    SpellCrit: raw['SpellCrit'] ?? 0,
    SpellCritDamage: raw['SpellCritDamage'] ?? 0,
    WeaponCritDamage: raw['WeaponCritDamage'] ?? 0,

    // Resistances
    PhysicalResist: raw['PhysicalResist'] ?? 0,
    SpellResist: raw['SpellResist'] ?? 0,
    CritResist: raw['CritResist'] ?? 0,

    // Penetration
    PhysicalPenetration: raw['PhysicalPenetration'] ?? 0,
    SpellPenetration: raw['SpellPenetration'] ?? 0,

    // Effective power
    EffectiveSpellPower: raw['EffectiveSpellPower'] ?? 0,
    EffectiveWeaponPower: raw['EffectiveWeaponPower'] ?? 0,
    EffectivePower: raw['EffectivePower'] ?? 0,

    // Healing
    HealingDone: raw['HealingDone'] ?? 0,
    HealingTaken: raw['HealingTaken'] ?? 0,

    // Speed
    RunSpeed: raw['RunSpeed'] ?? 0,
    SprintSpeed: raw['SprintSpeed'] ?? 0,

    // Mitigation
    AttackSpellMitigation: raw['AttackSpellMitigation'] ?? 0,
    AttackPhysicalMitigation: raw['AttackPhysicalMitigation'] ?? 0,
    DefenseSpellMitigation: raw['DefenseSpellMitigation'] ?? 0,
    DefensePhysicalMitigation: raw['DefensePhysicalMitigation'] ?? 0,

    raw,
  };
}

/**
 * Returns the catalog of buffs available in the loaded UESP engine.
 *
 * Each entry maps to one row in the UESP buff tab. Pass `entry.name` to
 * `BuildInput.activeBuffs` to enable that buff in a calculation.
 *
 * Must be called after `initEsoEngineFromData()`.
 *
 * @param group - Optional filter. Ex: "Major", "Minor", "Set", "Target",
 *   "Skill", "Potion", "Poison", "Cyrodiil", "Other".
 *   Omit to return all 164 buffs.
 */
export function listAvailableBuffs(group?: string): BuffInfo[] {
  const buffData = engineGlobals().g_EsoBuildBuffData;
  if (!buffData || typeof buffData !== 'object') return [];

  const result: BuffInfo[] = [];

  for (const [name, entry] of Object.entries(buffData)) {
    if (!entry || typeof entry !== 'object') continue;

    const entryGroup: string = entry.group ?? entry.groupName ?? '';
    if (group !== undefined && entryGroup !== group) continue;

    const effects = (Array.isArray(entry.effects) ? entry.effects : []).map((fx) => ({
      statId: fx.statId ?? '',
      value: Number(fx.value ?? 0),
      display: fx.display ?? '',
    }));

    result.push({
      name,
      group: entryGroup,
      icon: entry.icon ?? '',
      effects,
      isToggle: entry.isToggle ?? false,
      isVisible: entry.visible ?? entry.isVisible ?? true,
    });
  }

  return result;
}

// Helper used by calculateBuild (autoPassives) and listRacialPassives/listClassPassives.
// Uses g_EsoPassiveSkillSnapshot (written by loader.ts at engine init time) to avoid
// the engine's mutation of g_SkillsData.raceType during calculations.
function buildPassiveSkillInfos(
  filter: (v: EnginePassiveRecord) => boolean,
  sortKey: (v: EnginePassiveRecord) => string,
): PassiveSkillInfo[] {
  const snapshot = engineGlobals().g_EsoPassiveSkillSnapshot;
  if (!snapshot || typeof snapshot !== 'object') return [];

  return Object.values(snapshot)
    .filter((v) => v && filter(v))
    .map((v) => ({
      abilityId: Number(v.abilityId),
      name: v.name,
      baseName: v.baseName,
      rank: v.rank,
      maxRank: v.maxRank,
      skillLine: v.skillLine,
      description: v.description,
      icon: v.icon,
    }))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.rank - b.rank);
}

/**
 * Returns all racial passive skills for the given race.
 * Each passive may appear in multiple ranks (rank 1, 2, 3).
 * Pass the abilityId of the desired rank to BuildInput.passiveSkills.
 *
 * Must be called after initEsoEngineFromData().
 *
 * @param race - Race name as passed to BuildInput.character.race.
 *   Ex: "High Elf", "Nord", "Khajiit"
 */
export function listRacialPassives(race: string): PassiveSkillInfo[] {
  return buildPassiveSkillInfos(
    (v) => v.raceType === race,
    (v) => v.baseName,
  );
}

/**
 * Returns all class passive skills for the given class.
 * Each passive may appear in multiple ranks (rank 1, 2, 3).
 * Pass the abilityId of the desired rank to BuildInput.passiveSkills.
 *
 * Must be called after initEsoEngineFromData().
 *
 * @param className - Class name as passed to BuildInput.character.class.
 *   Ex: "Sorcerer", "Nightblade", "Dragonknight"
 */
export function listClassPassives(className: string): PassiveSkillInfo[] {
  return buildPassiveSkillInfos(
    (v) => v.classType === className,
    (v) => (v.skillLine ?? '') + v.baseName,
  );
}

/**
 * Returns all passive skills for the given skill line.
 * Each passive may appear in multiple ranks (rank 1, 2, 3).
 * Pass the abilityId of the desired rank to BuildInput.passiveSkills.
 *
 * Must be called after initEsoEngineFromData().
 *
 * @param skillLine - Skill line name as it appears in g_SkillsData.
 *   Use listAvailableSkillLines() to discover valid names.
 *   Examples: "Light Armor", "Heavy Armor", "Undaunted", "Destruction Staff",
 *   "Fighters Guild", "Mages Guild", "Psijic Order", "Assault", "Support",
 *   "Vampire", "Werewolf"
 */
export function listPassivesBySkillLine(skillLine: string): PassiveSkillInfo[] {
  return buildPassiveSkillInfos(
    (v) => v.skillLine === skillLine,
    (v) => v.baseName,
  );
}

/**
 * Returns all skill line names that have passive skills available.
 * Use the returned names with listPassivesBySkillLine().
 *
 * Must be called after initEsoEngineFromData().
 */
export function listAvailableSkillLines(): string[] {
  const snapshot = engineGlobals().g_EsoPassiveSkillSnapshot;
  if (!snapshot || typeof snapshot !== 'object') return [];

  const lines = new Set<string>();
  for (const v of Object.values(snapshot)) {
    if (v?.skillLine) lines.add(v.skillLine);
  }
  return Array.from(lines).sort();
}

/**
 * Returns all available toggle skills from the loaded UESP engine.
 * Pass entry.name to BuildInput.toggleSkills to enable it.
 *
 * Note: toggle skills with requiresCyrodiil=true also need character.cyrodiil=true.
 * Toggle skills backed by a passive (isPassive=true) need the associated skill
 * in passiveSkills/skillBars for the engine to process the description match.
 *
 * Must be called after initEsoEngineFromData().
 */
export function listAvailableToggleSkills(): ToggleSkillInfo[] {
  const toggleData = engineGlobals().g_EsoBuildToggledSkillData;
  if (!toggleData || typeof toggleData !== 'object') return [];

  const result: ToggleSkillInfo[] = [];

  for (const [name, entry] of Object.entries(toggleData)) {
    if (!entry || typeof entry !== 'object') continue;
    if (!name) continue; // skip anonymous entries (no nameId in the rule)

    const matchData = entry.matchData ?? {};
    const effects = (Array.isArray(matchData.effects) ? matchData.effects : []).map((fx) => ({
      statId: fx.statId ?? '',
      value: Number(fx.value ?? 0),
      display: fx.display ?? '',
    }));

    result.push({
      name,
      displayName: matchData.displayName ?? name,
      isPassive: entry.isPassive === true || entry.isPassive === 1,
      requiresCyrodiil: matchData.statRequireId === 'Cyrodiil',
      baseSkillId: String(matchData.baseSkillId ?? ''),
      maxTimes: entry.maxTimes != null ? Number(entry.maxTimes) : null,
      effects,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
