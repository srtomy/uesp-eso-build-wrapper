/**
 * Public types for uesp-eso-build-wrapper.
 *
 * DATA FLOW:
 * 1. Your front-end fetches item data from the UESP public API:
 *    https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
 * 2. Pass the returned object (UespItemApiData) directly to BuildInput.items[slot].
 * 3. Call calculateBuild(input) — the library injects everything into the UESP engine
 *    and returns the computed stats.
 *
 * UPDATING AFTER A NEW PATCH (when ZeniMax releases a new DLC):
 *   1. In vendor/uesp-esochardata/, run:
 *      git fetch upstream && git merge upstream/master
 *   2. Open https://esobuilds.uesp.net in a browser.
 *   3. Run vendor/uesp-data/browser-extract.js in the DevTools Console.
 *   4. Save the downloaded JSON to vendor/uesp-data/uesp-init-data.json.
 *   5. Run tests: npm test
 */

// ---------------------------------------------------------------------------
// Dados de item retornados pela API pública da UESP
// (esolog.uesp.net/exportJson.php?table=minedItem)
// Todos os campos são strings conforme a API retorna.
// ---------------------------------------------------------------------------
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
  [key: string]: string | undefined; // campos extras da API
}

// ---------------------------------------------------------------------------
// Slots de equipamento válidos no motor da UESP
// ---------------------------------------------------------------------------
// Food slot: use `abilityDesc` to apply food/drink buffs.
// The engine matches the text against buildRules.abilitydesc (17 rules) — see examples:
//   { itemId: '23274', type: '4', abilityDesc: 'Increase Max Health by 3094 and Max Magicka by 2856. Magicka Recovery by 315.' }
// Rules match "Max Health by N", "Max Magicka by N", "Magicka Recovery by N", etc.
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
export interface SkillSlot {
  /** Ability ID do skill. Corresponde ao abilityId no banco da UESP. */
  skillId: number;
  /**
   * Índice do morph: 0 = base, 1 = primeiro morph, 2 = segundo morph.
   * @default 0
   */
  morphIndex?: 0 | 1 | 2;
}

// ---------------------------------------------------------------------------
// Node de Champion Points
// ---------------------------------------------------------------------------
export interface ChampionPointNode {
  /**
   * Pontos investidos neste node.
   * Usado para resolver automaticamente a descrição via g_EsoCpSkillDesc[nodeId][points].
   * Obrigatório no caminho novo (quando buildRules.cp estiver carregado).
   */
  points?: number;
  /**
   * Override da descrição do node (opcional).
   * Se não fornecido, a descrição é resolvida automaticamente via g_EsoCpSkillDesc.
   * Ex: "Grants 1 Max Magicka per stage. Current bonus: 1000"
   */
  description?: string;
  /**
   * Valor numérico ou percentual do bônus atual.
   * Formato legado para quando buildRules.cp não estiver disponível.
   * Ex: 1000  ou  "10%"
   */
  currentBonus?: number | string;
}

// ---------------------------------------------------------------------------
// Input para a função calculateBuild()
// ---------------------------------------------------------------------------
export interface BuildInput {
  character: {
    /** Raça. Ex: "High Elf", "Nord", "Breton", "Khajiit", "Dark Elf" */
    race: string;
    /** Classe. Ex: "Sorcerer", "Dragonknight", "Nightblade", "Templar" */
    class: string;
    /** Nível do personagem: 1–50 */
    level: number;
    /** Pontos de atributo distribuídos (máx 64 cada, total 64) */
    attributes: {
      health: number;
      magicka: number;
      stamina: number;
    };
    /** Pedra de Mundus ativa. Ex: "The Thief", "The Apprentice" */
    mundusStone?: string;
    /** Habilita Battle Spirit (modo PvP Cyrodiil) */
    cyrodiil?: boolean;
    /** Estágio de vampiro: 0–4 */
    vampireStage?: number;
    /** Estágio de lobisomem: 0 ou 1 */
    werewolfStage?: number;
    /** Total de Champion Points (0–3600). Distribuição detalhada via cpData. */
    championPoints?: number;
    /** Versão das regras: "Live" (padrão) ou "PTS" */
    rulesVersion?: string;
  };
  /**
   * Itens equipados. Passe o objeto retornado pela API da UESP diretamente.
   * Busca: GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
   * Mapeie o item desejado (do array .minedItem[]) ao slot correto.
   */
  items?: Partial<Record<EquipSlot, UespItemApiData>>;
  /**
   * Nodes do Champion Points 2 que estão desbloqueados.
   * Chave: ID numérico do node (rule ID de ESO_CPEFFECT_MATCHES ou abilityId legado).
   *
   * Formato preferido (quando buildRules.cp está carregado):
   *   description: texto completo do node que casa com a regex da regra CP.
   *   Ex: { 38750: { description: "Grants 1 Max Magicka per stage. Current bonus: 1000" } }
   *
   * Formato legado (quando buildRules.cp não está disponível):
   *   currentBonus: valor do "Current bonus: X" ou "Current value: X%"
   *   Ex: { 141744: { currentBonus: 1000 } }
   *
   * Requer que character.championPoints > 0.
   */
  championPointNodes?: Record<string | number, ChampionPointNode>;
  /**
   * Nomes exatos dos buffs ativos (habilitados para o cálculo).
   * Ex: ["Minor Slayer", "Major Prophecy", "Major Savagery"]
   * Usa o mesmo nome que aparece em g_EsoBuildBuffData da UESP.
   */
  activeBuffs?: string[];
  /**
   * Nomes exatos das toggle skills habilitadas.
   * Ex: ["Emperor", "Authority", "Domination", "Tactician"]
   * Usa o mesmo nome que aparece em g_EsoBuildToggledSkillData da UESP.
   *
   * @note Os skills são injetados mas efeitos de stat requerem g_SkillsData
   * (não incluído no uesp-init-data.json atual). O campo é aceito sem crash.
   */
  toggleSkills?: string[];
  /**
   * Skills slotados nas barras de habilidade do personagem (máx 6 por barra).
   *
   * A presença de skills na barra ativa passivos de skill line (ex: passivos de
   * Destruction Staff só se aplicam se houver um skill dessa linha na barra).
   * Também afeta set bonuses condicionais como "Adds N damage to your Class abilities".
   *
   * @note Requer g_SkillsData para aplicar efeitos de passivos de skill line.
   * Sem g_SkillsData, os skill IDs são injetados em g_EsoSkillBarData mas os
   * passivos correspondentes não geram stats. Será totalmente funcional em
   * versão futura quando g_SkillsData for incluído no uesp-init-data.json.
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
   * Qual barra de armas está ativa para o cálculo.
   * Afeta quais itens de MainHand/OffHand contam para set bonuses e enchants.
   * - `1` = barra principal (MainHand1 / OffHand1) — padrão
   * - `2` = barra secundária (MainHand2 / OffHand2)
   *
   * @default 1
   */
  activeWeaponBar?: 1 | 2;
}

// ---------------------------------------------------------------------------
// Resultado calculado pelo motor da UESP
// Os stat IDs batem exatamente com os de g_EsoComputedStats (versão 49+).
// ---------------------------------------------------------------------------
export interface ComputedStats {
  // Atributos máximos
  Health: number;
  Magicka: number;
  Stamina: number;

  // Regeneração
  HealthRegen: number;
  MagickaRegen: number;
  StaminaRegen: number;

  // Dano
  WeaponDamage: number;
  SpellDamage: number;

  // Crítico
  WeaponCrit: number;
  SpellCrit: number;
  SpellCritDamage: number;
  WeaponCritDamage: number;

  // Resistências
  PhysicalResist: number;
  SpellResist: number;
  CritResist: number;

  // Penetração
  PhysicalPenetration: number;
  SpellPenetration: number;

  // Poder efetivo
  EffectiveSpellPower: number;
  EffectiveWeaponPower: number;
  EffectivePower: number;

  // Cura
  HealingDone: number;
  HealingTaken: number;

  // Velocidade
  RunSpeed: number;
  SprintSpeed: number;

  // Mitigação (calculada internamente como AttackSpellMitigation etc.)
  AttackSpellMitigation: number;
  AttackPhysicalMitigation: number;
  DefenseSpellMitigation: number;
  DefensePhysicalMitigation: number;

  /** Objeto bruto com TODOS os valores de g_EsoComputedStats após o cálculo */
  raw: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Dados de inicialização do motor (extraídos do browser uma única vez)
// Formato do arquivo vendor/uesp-data/uesp-init-data.json
// ---------------------------------------------------------------------------
export interface UespInitData {
  /** Fórmulas de cálculo dos stats (a "inteligência" do motor) */
  computedStats: Record<string, unknown>;
  /** Definições dos stats de entrada (estrutura de inputValues) */
  inputStats: Record<string, unknown>;
  /** Dados de buffs iniciais */
  buffData?: Record<string, unknown>;
  /** Dados de Champion Points iniciais */
  cpData?: Record<string, unknown>;
  /** Regras gerais da build */
  buildRules?: Record<string, unknown>;
  /** Dados de skills (vindos do banco da UESP) */
  skillsData?: Record<string, unknown>;
  /** Dados de skills de sets */
  setSkillsData?: Record<string, unknown>;
  /** Metadados dos nodes CP2: nome, disciplina, cluster, posição no grafo */
  cpSkillsData?: Record<string, unknown>;
  /** Descrições dos nodes CP2 por nível de pontos: cpSkillDescData[nodeId][points] */
  cpSkillDescData?: Record<string, Record<string, string>>;
}
