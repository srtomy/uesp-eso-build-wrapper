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
  armorRating?: string;   // Armor value (e.g. "1234")
  weaponPower?: string;   // Weapon damage
  armorType?: string;     // 0=none, 1=light, 2=medium, 3=heavy
  weaponType?: string;    // 0=none, 1=axe1h, 4=sword2h, 8=bow, 12=flamestaf, etc.
  type?: string;
  equipType?: string;
  trait?: string;
  traitDesc?: string;     // "Increases Critical Resistance by 47..."
  enchantId?: string;
  enchantName?: string;
  enchantDesc?: string;   // "Adds 70 Maximum Stamina."
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
export type EquipSlot =
  | 'Head' | 'Shoulders' | 'Chest' | 'Hands' | 'Legs' | 'Waist' | 'Feet'
  | 'Neck' | 'Ring1' | 'Ring2'
  | 'MainHand1' | 'OffHand1' | 'MainHand2' | 'OffHand2'
  | 'Poison1' | 'Poison2' | 'Food' | 'Potion';

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
}
