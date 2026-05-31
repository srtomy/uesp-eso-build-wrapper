/**
 * Motor de cálculo de builds do ESO.
 *
 * Implementa a ideia central da arquitetura:
 *
 *   1. Injetar dados do personagem nos elementos mock do DOM
 *      (jQuery vai ler via $("#esotbRace").val(), etc.)
 *
 *   2. Injetar dados dos itens DIRETAMENTE em g_EsoBuildItemData[slot]
 *      — sem precisar mockar jQuery para cada campo de item.
 *      Os campos vêm exatamente no formato da API pública da UESP:
 *      GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>
 *
 *   3. Chamar UpdateEsoComputedStatsList_Real(null, true)
 *      — o parâmetro `noUpdate=true` faz o motor calcular tudo mas pular
 *      as atualizações de DOM (DisplayEsoAllComputedStats, UpdateReadOnlyStats, etc.)
 *
 *   4. Ler os resultados de g_EsoComputedStats[statId].value
 */

import { setDomValue, resetDomValues } from './env-setup';
import type { BuildInput, ComputedStats, EquipSlot } from './types';

const ALL_SLOTS: EquipSlot[] = [
  'Head', 'Shoulders', 'Chest', 'Hands', 'Legs', 'Waist', 'Feet',
  'Neck', 'Ring1', 'Ring2',
  'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2',
  'Poison1', 'Poison2', 'Food', 'Potion',
];

/**
 * Normaliza os dados de um item garantindo que todos os campos opcionais
 * existam com defaults seguros. Sem isso, o motor lança TypeError ao tentar
 * chamar .includes() em campos de set bonus undefined (setBonusDesc5..12).
 */
function normalizeItemData(item: any): any {
  const defaults: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) {
    defaults[`setBonusCount${i}`] = item[`setBonusCount${i}`] ?? '-1';
    defaults[`setBonusDesc${i}`]  = item[`setBonusDesc${i}`]  ?? '';
  }
  return { ...defaults, ...item };
}

/**
 * Calcula os Computed Character Statistics para a build fornecida.
 *
 * @example
 * ```ts
 * import { calculateBuild } from './src/lib/eso-engine';
 *
 * const stats = calculateBuild({
 *   character: { race: 'High Elf', class: 'Sorcerer', level: 50,
 *                attributes: { health: 0, magicka: 64, stamina: 0 } },
 *   items: {
 *     Chest: chestItemFromUespApi,  // objeto retornado por esolog.uesp.net/exportJson.php
 *   },
 * });
 * console.log(stats.MaxMagicka, stats.SpellDamage);
 * ```
 */
export function calculateBuild(input: BuildInput): ComputedStats {
  // -------------------------------------------------------------------------
  // PASSO 1: Injeta stats do personagem nos elementos mock do DOM.
  // O motor lê esses valores via jQuery: $("#esotbRace").val(), etc.
  // -------------------------------------------------------------------------
  resetDomValues();

  const { character, items } = input;

  setDomValue('esotbRace',  character.race);
  setDomValue('esotbClass', character.class);
  setDomValue('esotbLevel', String(Math.min(character.level, 50)));
  setDomValue('esotbAttrHea', String(character.attributes.health  ?? 0));
  setDomValue('esotbAttrMag', String(character.attributes.magicka ?? 0));
  setDomValue('esotbAttrSta', String(character.attributes.stamina ?? 0));

  // Mundus Stone (pedra de Mundus)
  if (character.mundusStone) {
    setDomValue('esotbMundus', character.mundusStone);
  }

  // PvP Cyrodiil (Battle Spirit)
  if (character.cyrodiil) {
    setDomValue('esotbCyrodiil', 'true'); // prop("checked") retorna true quando valor é "true"
  }

  // Vampiro / Lobisomem
  if (character.vampireStage  != null) setDomValue('esotbVampireStage',  String(character.vampireStage));
  if (character.werewolfStage != null) setDomValue('esotbWerewolfStage', String(character.werewolfStage));

  // Champion Points
  if (character.championPoints != null) {
    setDomValue('esotbCPTotalPoints', String(character.championPoints));
  }

  // Versão das regras (padrão: Live)
  setDomValue('esotbRulesVersion', character.rulesVersion ?? 'Live');

  // Campos obrigatórios com defaults seguros
  setDomValue('esotbMountSpeedBonus', '0');
  setDomValue('esotbBaseWalkSpeed',   '3.0');
  setDomValue('esotbBuildDescription', '');
  setDomValue('esotbUsePtsRules', 'false');
  setDomValue('esotbEnableRaceAutoPurchase', 'false');
  setDomValue('esotbTargetResistance', '0');

  // -------------------------------------------------------------------------
  // PASSO 2: Injeta dados de itens DIRETAMENTE em g_EsoBuildItemData[slot].
  //
  // Esta é a ideia central: em vez de mockar jQuery para cada campo de item,
  // populamos a variável global que o motor lê nativamente.
  // Os dados vêm exatamente no formato da API pública da UESP — sem adaptação.
  // -------------------------------------------------------------------------
  const itemData: any = (global as any).g_EsoBuildItemData;
  const enchantData: any = (global as any).g_EsoBuildEnchantData;

  // Reseta todos os slots (evita dados de chamada anterior)
  for (const slot of ALL_SLOTS) {
    itemData[slot]   = {};
    if (enchantData) enchantData[slot] = {};
  }

  // Injeta os itens fornecidos (normalizados com defaults seguros)
  if (items) {
    for (const [slot, item] of Object.entries(items) as [EquipSlot, any][]) {
      if (item && item.itemId) {
        itemData[slot] = normalizeItemData(item);
      }
    }
  }

  // -------------------------------------------------------------------------
  // PASSO 3: Executa o cálculo.
  //
  // UpdateEsoComputedStatsList_Real(keepSaveResults, noUpdate)
  //   - keepSaveResults = null  → reseta os resultados salvos (comportamento padrão)
  //   - noUpdate = true         → pula DisplayEsoAllComputedStats e UpdateReadOnlyStats
  //                               (operações de DOM que não precisamos)
  // -------------------------------------------------------------------------
  const updateFn = (global as any).UpdateEsoComputedStatsList_Real;
  if (typeof updateFn !== 'function') {
    throw new Error(
      '[eso-engine] UpdateEsoComputedStatsList_Real não está disponível. ' +
      'Certifique-se de chamar initEsoEngine() antes de calculateBuild().'
    );
  }

  updateFn(null, true);

  // -------------------------------------------------------------------------
  // PASSO 4: Lê os resultados de g_EsoComputedStats[statId].value
  // -------------------------------------------------------------------------
  const computedStats: any = (global as any).g_EsoComputedStats ?? {};
  const raw: Record<string, number> = {};

  for (const statId of Object.keys(computedStats)) {
    const stat = computedStats[statId];
    if (stat && typeof stat === 'object' && typeof stat.value === 'number') {
      raw[statId] = stat.value;
    }
  }

  return {
    // Atributos máximos
    Health:  raw['Health']  ?? 0,
    Magicka: raw['Magicka'] ?? 0,
    Stamina: raw['Stamina'] ?? 0,

    // Regeneração
    HealthRegen:  raw['HealthRegen']  ?? 0,
    MagickaRegen: raw['MagickaRegen'] ?? 0,
    StaminaRegen: raw['StaminaRegen'] ?? 0,

    // Dano
    WeaponDamage: raw['WeaponDamage'] ?? 0,
    SpellDamage:  raw['SpellDamage']  ?? 0,

    // Crítico
    WeaponCrit:       raw['WeaponCrit']       ?? 0,
    SpellCrit:        raw['SpellCrit']        ?? 0,
    SpellCritDamage:  raw['SpellCritDamage']  ?? 0,
    WeaponCritDamage: raw['WeaponCritDamage'] ?? 0,

    // Resistências
    PhysicalResist: raw['PhysicalResist'] ?? 0,
    SpellResist:    raw['SpellResist']    ?? 0,
    CritResist:     raw['CritResist']     ?? 0,

    // Penetração
    PhysicalPenetration: raw['PhysicalPenetration'] ?? 0,
    SpellPenetration:    raw['SpellPenetration']    ?? 0,

    // Poder efetivo
    EffectiveSpellPower:  raw['EffectiveSpellPower']  ?? 0,
    EffectiveWeaponPower: raw['EffectiveWeaponPower'] ?? 0,
    EffectivePower:       raw['EffectivePower']       ?? 0,

    // Cura
    HealingDone:  raw['HealingDone']  ?? 0,
    HealingTaken: raw['HealingTaken'] ?? 0,

    // Velocidade
    RunSpeed:    raw['RunSpeed']    ?? 0,
    SprintSpeed: raw['SprintSpeed'] ?? 0,

    // Mitigação
    AttackSpellMitigation:    raw['AttackSpellMitigation']    ?? 0,
    AttackPhysicalMitigation: raw['AttackPhysicalMitigation'] ?? 0,
    DefenseSpellMitigation:   raw['DefenseSpellMitigation']   ?? 0,
    DefensePhysicalMitigation: raw['DefensePhysicalMitigation'] ?? 0,

    raw,
  };
}
