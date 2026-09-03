/**
 * Public types for uesp-eso-build-wrapper.
 *
 * DATA FLOW:
 * 1. Your front-end fetches item data from the UESP public API:
 *    `https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>`
 * 2. Pass the returned object (UespItemApiData) directly to BuildInput.items[slot].
 * 3. Call calculateBuild(input) — the library injects everything into the UESP engine
 *    and returns the computed stats.
 *
 * UPDATING AFTER A NEW PATCH (when ZeniMax releases a new DLC):
 *   1. In vendor/uesp-esochardata/, run:
 *      git fetch upstream && git merge upstream/master
 *   2. Download the latest UESP SQL dumps and seed local.db.
 *   3. Run: npm run generate-data -- --db /path/to/local.db --version <patch>
 *   4. Commit vendor/uesp-data/uesp-game-data.json
 *   5. Run tests: npm test
 */

// ---------------------------------------------------------------------------
// Buff catalog — returned by listAvailableBuffs()
// ---------------------------------------------------------------------------

/** Buff group, matching the UESP UI tabs. */
export type BuffGroup =
  | 'Major'
  | 'Minor'
  | 'Set'
  | 'Target'
  | 'Skill'
  | 'Potion'
  | 'Poison'
  | 'Cyrodiil'
  | 'Other'
  | (string & {});

/** A single buff effect on a stat. */
export interface BuffEffect {
  /** Affected stat ID. Ex: "SpellCrit", "WeaponDamage", "CritDamage" */
  statId: string;
  /** Numeric effect value (already in the stat's unit). */
  value: number;
  /**
   * UESP display type.
   * "%" → value is in percentage points (e.g. 20 = 20%, i.e. 0.2 on the final stat).
   * "" → absolute value in the same unit system as the stat.
   */
  display: string;
}

/** Info about a buff available in the engine catalog. */
export interface BuffInfo {
  /** Exact name to pass in `activeBuffs`. Ex: "Major Prophecy" */
  name: string;
  /** Buff group — matches the UESP interface tabs. */
  group: BuffGroup;
  /** Relative icon URL on UESP. Ex: "/esoui/art/icons/ability_debuff_major_cowardice.png" */
  icon: string;
  /** Effects on stats when enabled. */
  effects: BuffEffect[];
  /** True if this buff is a toggle (can be switched on/off in the tab). */
  isToggle: boolean;
  /** True if this buff is visible in the UESP buff tab. */
  isVisible: boolean;
}

/** One passive skill at a specific rank, as returned by the `list*Passives()` catalog functions. */
export interface PassiveSkillInfo {
  abilityId: number;
  name: string;
  baseName: string;
  rank: number;
  maxRank: number;
  skillLine: string;
  description: string;
  icon: string;
}

/** One toggle skill from the UESP toggle tab, as returned by listAvailableToggleSkills(). */
export interface ToggleSkillInfo {
  name: string;
  displayName: string;
  isPassive: boolean;
  requiresCyrodiil: boolean;
  baseSkillId: string;
  maxTimes: number | null;
  effects: BuffEffect[];
}

/**
 * Item data as returned by the UESP public item API
 * (esolog.uesp.net/exportJson.php?table=minedItem).
 * Pass the object straight into BuildInput.items[slot] — no transformation needed.
 * All fields are strings, exactly as the API returns them.
 */
export interface UespItemApiData {
  itemId: string;
  name?: string;
  armorRating?: string; // Armor value (e.g. "1234")
  weaponPower?: string; // Weapon damage
  armorType?: string; // 0=none, 1=light, 2=medium, 3=heavy
  weaponType?: string; // 0=none, 1=axe1h, 4=sword2h, 8=bow, 12=flamestaf, etc.
  type?: string;
  equipType?: string;
  trait?: string;
  traitDesc?: string; // "Increases Critical Resistance by 47..."
  enchantId?: string;
  enchantName?: string;
  enchantDesc?: string; // "Adds 70 Maximum Stamina."
  internalLevel?: string;
  internalSubtype?: string;
  setId?: string;
  setName?: string;
  setBonusCount?: string;
  setMaxEquipCount?: string;
  setBonusCount1?: string;
  setBonusCount2?: string;
  setBonusCount3?: string;
  setBonusCount4?: string;
  setBonusCount5?: string;
  setBonusDesc1?: string;
  setBonusDesc2?: string;
  setBonusDesc3?: string;
  setBonusDesc4?: string;
  setBonusDesc5?: string;
  abilityDesc?: string;
  link?: string;
  [key: string]: string | undefined; // extra API fields
}

// ---------------------------------------------------------------------------
// Valid equipment slots in the UESP engine
// ---------------------------------------------------------------------------
// Food slot: use `abilityDesc` to apply food/drink buffs.
// The engine matches the text against buildRules.abilitydesc (17 rules) — see examples:
//   { itemId: '23274', type: '4', abilityDesc: 'Increase Max Health by 3094 and Max Magicka by 2856. Magicka Recovery by 315.' }
// Rules match "Max Health by N", "Max Magicka by N", "Magicka Recovery by N", etc.

/** Equipment slots accepted by BuildInput.items. */
export type EquipSlot =
  | 'Head'
  | 'Shoulders'
  | 'Chest'
  | 'Hands'
  | 'Legs'
  | 'Waist'
  | 'Feet'
  | 'Neck'
  | 'Ring1'
  | 'Ring2'
  | 'MainHand1'
  | 'OffHand1'
  | 'MainHand2'
  | 'OffHand2'
  | 'Poison1'
  | 'Poison2'
  | 'Food'
  | 'Potion';

// ---------------------------------------------------------------------------
// Skill bar
// ---------------------------------------------------------------------------
/** One skill slotted on an action bar (BuildInput.skillBars). */
export interface SkillSlot {
  /**
   * Lookup key in g_EsoSkillActiveData — matches origSkillId in the Build Editor DOM
   * (base/unmorphed skill ID). For morph-less skills it equals morphSkillId.
   */
  skillId: number;
  /**
   * Ability ID of the current morph (specific rank). Used as a key into g_SkillsData and in
   * GetEsoSkillDescription to get the correct description with the slotted morph's bonuses.
   * If absent, the engine uses skillId (for morph-less skills).
   */
  morphSkillId?: number;
  /**
   * Morph index: 0 = base, 1 = first morph, 2 = second morph.
   * @default 0
   */
  morphIndex?: 0 | 1 | 2;
}

// ---------------------------------------------------------------------------
// Champion Points node
// ---------------------------------------------------------------------------
/** One Champion Point node in BuildInput.championPointNodes. */
export interface ChampionPointNode {
  /**
   * Points invested in this node.
   * Used to auto-resolve the description via g_EsoCpSkillDesc[nodeId][points].
   * Required on the new path (when buildRules.cp is loaded).
   */
  points?: number;
  /**
   * Node description override (optional).
   * If not provided, the description is auto-resolved via g_EsoCpSkillDesc.
   * Ex: "Grants 1 Max Magicka per stage. Current bonus: 1000"
   */
  description?: string;
  /**
   * Numeric or percentage value of the current bonus.
   * Legacy format for when buildRules.cp is unavailable.
   * Ex: 1000  or  "10%"
   */
  currentBonus?: number | string;
  /**
   * Whether the node is active/slotted in UESP.
   * false = node has points but is not slotted (unslotted slottable nodes).
   * When absent (old fixtures), assumed true for compatibility.
   */
  isUnlocked?: boolean;
}

// ---------------------------------------------------------------------------
// Input for the calculateBuild() function
// ---------------------------------------------------------------------------
/**
 * Complete input for calculateBuild(): character sheet plus everything the
 * character "has" — items, Champion Points, buffs, toggle skills, skill bars
 * and passives.
 *
 * Only `character` is required; everything else is optional and starts empty.
 * Each calculateBuild() call starts from a clean state — inputs never bleed
 * between calls.
 */
export interface BuildInput {
  character: {
    /** Race. Ex: "High Elf", "Nord", "Breton", "Khajiit", "Dark Elf" */
    race: string;
    /** Class. Ex: "Sorcerer", "Dragonknight", "Nightblade", "Templar" */
    class: string;
    /** Character level: 1–50 */
    level: number;
    /** Distributed attribute points (max 64 each, 64 total) */
    attributes: {
      health: number;
      magicka: number;
      stamina: number;
    };
    /** Active Mundus Stone. Ex: "The Thief", "The Apprentice" */
    mundusStone?: string;
    /**
     * Second active Mundus Stone.
     * Requires the "Twice-Born Star" set (5 pieces equipped).
     * Ex: "The Apprentice"
     */
    mundusStone2?: string;
    /** Enables Battle Spirit (Cyrodiil PvP mode) */
    cyrodiil?: boolean;
    /** Vampire stage: 0–4 */
    vampireStage?: number;
    /** Werewolf stage: 0 or 1 */
    werewolfStage?: number;
    /** Total Champion Points (0–3600). Detailed distribution via cpData. */
    championPoints?: number;
    /** Rules version: "Live" (default) or "PTS" */
    rulesVersion?: string;
  };
  /**
   * Equipped items. Pass the object returned by the UESP API directly.
   * Lookup: `GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>`
   * Map the desired item (from the .minedItem[] array) to the correct slot.
   */
  items?: Partial<Record<EquipSlot, UespItemApiData>>;
  /**
   * Unlocked Champion Points 2 nodes.
   * Key: numeric node ID (ESO_CPEFFECT_MATCHES rule ID or legacy abilityId).
   *
   * Preferred format (when buildRules.cp is loaded):
   *   description: full node text matching the CP rule regex.
   *   Ex: { 38750: { description: "Grants 1 Max Magicka per stage. Current bonus: 1000" } }
   *
   * Legacy format (when buildRules.cp is unavailable):
   *   currentBonus: value of "Current bonus: X" or "Current value: X%"
   *   Ex: { 141744: { currentBonus: 1000 } }
   *
   * Requires character.championPoints > 0.
   */
  championPointNodes?: Record<string | number, ChampionPointNode>;
  /**
   * Exact names of active buffs (enabled for the calculation).
   * Ex: ["Minor Slayer", "Major Prophecy", "Major Savagery"]
   * Uses the same name as in UESP's g_EsoBuildBuffData.
   */
  activeBuffs?: string[];
  /**
   * Exact names of enabled toggle skills.
   * Ex: ["Emperor", "Authority", "Domination", "Tactician"]
   * Uses the same name as in UESP's g_EsoBuildToggledSkillData.
   */
  toggleSkills?: string[];
  /**
   * Skills slotted on the character's action bars (max 6 per bar).
   *
   * Slotted skills enable skill line passives (e.g. Destruction Staff passives
   * only apply if a skill from that line is on the bar).
   * Also affects conditional set bonuses like "Adds N damage to your Class abilities".
   *
   * @example
   * ```ts
   * skillBars: {
   *   bar1: [
   *     { skillId: 28807, morphIndex: 2 }, // Crystal Fragments (morph 2)
   *     { skillId: 24322 },                 // Mages' Fury (base)
   *   ],
   *   bar2: [
   *     { skillId: 29073, morphIndex: 1 }, // Boundless Storm (morph 1)
   *   ],
   * }
   * ```
   */
  skillBars?: {
    bar1?: SkillSlot[];
    bar2?: SkillSlot[];
  };
  /**
   * Which weapon bar is active for the calculation.
   * Affects which MainHand/OffHand items count for set bonuses and enchants.
   * - `1` = main bar (MainHand1 / OffHand1) — default
   * - `2` = secondary bar (MainHand2 / OffHand2)
   *
   * @default 1
   */
  activeWeaponBar?: 1 | 2;
  /**
   * Ability IDs of the passive skills the character has unlocked.
   * The engine automatically applies each passive's effect via regex on the
   * description text (ESO_PASSIVEEFFECT_MATCHES).
   *
   * Requires g_SkillsData to contain the skill data (present in
   * uesp-game-data.json generated via npm run generate-data).
   *
   * IDs match the `abilityId` column in the UESP database.
   * Example: High Elf's "Highborn" passive has abilityId 45284.
   */
  passiveSkills?: number[];
  /**
   * When true, automatically injects the highest-rank racial passives for
   * character.race (in addition to any explicit passiveSkills).
   *
   * Mirrors the UESP "Auto Purchase Racial Passives" checkbox — class passives
   * must be passed explicitly via passiveSkills or listClassPassives().
   *
   * @default false
   */
  autoPassives?: boolean;
  /**
   * Custom enchantments per slot — override the item's default enchantDesc.
   * Auto-generated by browser-export-build.js when the user swaps the
   * enchantment in the UESP Build Editor. The calculator injects this data into
   * g_EsoBuildEnchantData[slot] (isDefaultEnchant=false), making the engine apply
   * the correct scale factor for small slots (Hands/Waist/Feet/Shoulders: ×0.4044).
   *
   * @example
   * ```ts
   * enchantOverrides: {
   *   Head:  { enchantDesc: 'Adds up to 868 Maximum Magicka.', enchantName: 'Maximum Magicka Enchantment' },
   *   Hands: { enchantDesc: 'Adds up to 868 Maximum Magicka.', enchantName: 'Maximum Magicka Enchantment' },
   * }
   * ```
   */
  enchantOverrides?: Partial<Record<string, { enchantDesc: string; enchantName?: string }>>;
  /**
   * Keys of enabled toggle set bonuses (matching g_EsoBuildToggledSetData).
   * Auto-exported by browser-export-build.js when the user enables a toggle.
   *
   * Keys are the rule's `nameId` (string), e.g.:
   *   - "Ansuul's Torment"         → +7% damage done against monsters (base)
   *   - "Ansuul's Torment (Bonus Damage)" → +14% additional (on interrupt)
   *   - "Spectral Cloak"           → +6% damage done (via Blade Cloak proc)
   */
  toggledSetBonuses?: string[];
}

// ---------------------------------------------------------------------------
// Result computed by the UESP engine
// Stat IDs match g_EsoComputedStats exactly (version 49+).
// ---------------------------------------------------------------------------
/**
 * The result of calculateBuild(): the key stats as named properties, plus
 * `raw` with all 221 computed stats from the UESP engine.
 *
 * Stat IDs match `g_EsoComputedStats` exactly (UESP version 49+). Percent
 * values are returned as the engine stores them (e.g. 12.5 = 12.5%).
 */
export interface ComputedStats {
  // Max attributes
  Health: number;
  Magicka: number;
  Stamina: number;

  // Regeneration
  HealthRegen: number;
  MagickaRegen: number;
  StaminaRegen: number;

  // Damage
  WeaponDamage: number;
  SpellDamage: number;

  // Critical
  WeaponCrit: number;
  SpellCrit: number;
  SpellCritDamage: number;
  WeaponCritDamage: number;

  // Resistances
  PhysicalResist: number;
  SpellResist: number;
  CritResist: number;

  // Penetration
  PhysicalPenetration: number;
  SpellPenetration: number;

  // Effective power
  EffectiveSpellPower: number;
  EffectiveWeaponPower: number;
  EffectivePower: number;

  // Healing
  HealingDone: number;
  HealingTaken: number;

  // Speed
  RunSpeed: number;
  SprintSpeed: number;

  // Mitigation (computed internally as AttackSpellMitigation etc.)
  AttackSpellMitigation: number;
  AttackPhysicalMitigation: number;
  DefenseSpellMitigation: number;
  DefensePhysicalMitigation: number;

  /** Raw object with ALL g_EsoComputedStats values after the calculation */
  raw: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Engine init data
// ---------------------------------------------------------------------------

export interface UespInitData {
  /** Stat calculation formulas (the engine's "brains") */
  computedStats: Record<string, unknown>;
  /** Initial buff data */
  buffData?: Record<string, unknown>;
  /** Initial Champion Points data */
  cpData?: Record<string, unknown>;
  /** General build rules */
  buildRules?: Record<string, unknown>;
  /**
   * Complete UESP skill database (race/class passives, actives, set skills).
   * Captured from window.g_SkillsData after en.uesp.net/wiki/Special:EsoBuildEditor loads.
   * Required for GetEsoSkillDescription to interpolate coefficients into texts.
   */
  skillsData?: Record<string, unknown>;
  /** Set skill data */
  setSkillsData?: Record<string, unknown>;
  /** CP2 node metadata: name, discipline, cluster, graph position */
  cpSkillsData?: Record<string, unknown>;
  /** CP2 node descriptions by points level: cpSkillDescData[nodeId][points] */
  cpSkillDescData?: Record<string, Record<string, string>>;
}
