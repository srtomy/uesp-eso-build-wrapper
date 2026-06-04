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

import { resetDomValues, setDomAttr, setDomTextContent, setDomValue } from './env-setup';
import type { BuildInput, ComputedStats, EquipSlot } from './types';

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
 * Normaliza os dados de um item garantindo que todos os campos opcionais
 * existam com defaults seguros. Sem isso, o motor lança TypeError ao tentar
 * chamar .includes() em campos de set bonus undefined (setBonusDesc5..12).
 */
function normalizeItemData(item: any): any {
  const defaults: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) {
    defaults[`setBonusCount${i}`] = item[`setBonusCount${i}`] ?? '-1';
    defaults[`setBonusDesc${i}`] = item[`setBonusDesc${i}`] ?? '';
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

  const {
    character,
    items,
    championPointNodes,
    activeBuffs,
    toggleSkills,
    skillBars,
    activeWeaponBar,
  } = input;

  setDomValue('esotbRace', character.race);
  setDomValue('esotbClass', character.class);
  setDomValue('esotbLevel', String(Math.min(character.level, 50)));
  setDomValue('esotbAttrHea', String(character.attributes.health ?? 0));
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
  if (character.vampireStage != null)
    setDomValue('esotbVampireStage', String(character.vampireStage));
  if (character.werewolfStage != null)
    setDomValue('esotbWerewolfStage', String(character.werewolfStage));

  // Champion Points (default 0 — garante que SpellCrit e WeaponCrit sejam numéricos)
  setDomValue('esotbCPTotalPoints', String(character.championPoints ?? 0));

  // Versão das regras (padrão: Live)
  setDomValue('esotbRulesVersion', character.rulesVersion ?? 'Live');

  // Campos obrigatórios com defaults seguros
  setDomValue('esotbMountSpeedBonus', '0');
  setDomValue('esotbBaseWalkSpeed', '3.0');
  setDomValue('esotbBuildDescription', '');
  setDomValue('esotbUsePtsRules', 'false');
  setDomValue('esotbEnableRaceAutoPurchase', 'false');

  // Configuração do alvo (target) — necessária para AttackSpellMitigation e EffectivePower.
  // Target.EffectiveLevel = 0 causa divisão por zero na fórmula; padrão 50 é o nível máximo.
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
    itemData[slot] = {};
    if (enchantData) enchantData[slot] = {};
  }

  // Reseta g_EsoCpData para evitar bleed-through entre chamadas
  (global as any).g_EsoCpData = {};
  const cpDataGlobal: any = (global as any).g_EsoCpData;

  // Injeta os itens fornecidos (normalizados com defaults seguros)
  if (items) {
    for (const [slot, item] of Object.entries(items) as [EquipSlot, any][]) {
      if (item && item.itemId) {
        itemData[slot] = normalizeItemData(item);
      }
    }
  }

  // -------------------------------------------------------------------------
  // PASSO 3a: Injeta nodes do Champion Points 2.
  //
  // Dois caminhos dependendo se buildRules.cp está carregado:
  //
  // Novo (preferido): quando g_EsoBuildRules['cp'] existe, o motor usa o caminho
  //   GetEsoBuildCpRuleValues que lê cpData.description e faz match contra
  //   ESO_CPEFFECT_MATCHES. Populamos g_EsoCpData[nodeId] com a description completa.
  //
  // Legado: sem cp rules, o motor usa ParseEsoCP2Value com injeção DOM via
  //   $("#skill_<id>").attr("unlocked") e $("#descskill_<id>").text().
  // -------------------------------------------------------------------------
  if (championPointNodes && Object.keys(championPointNodes).length > 0) {
    setDomValue('esotbEnableCP', 'true');
    const hasCpRules = !!(global as any).g_EsoBuildRules?.cp;
    const cpSkills: any = (global as any).g_EsoCpSkills ?? {};
    const cpSkillDesc: any = (global as any).g_EsoCpSkillDesc ?? {};

    for (const [nodeId, nodeData] of Object.entries(championPointNodes)) {
      if (hasCpRules) {
        // Resolve o nome a partir dos metadados capturados do browser.
        const name = cpSkills[nodeId]?.name ?? `CP_${nodeId}`;

        // Resolve a descrição dinamicamente:
        //   1. Override explícito do chamador
        //   2. Lookup exato por nodeData.points em g_EsoCpSkillDesc[nodeId]
        //   3. Floor lookup: maior chave disponível ≤ points
        //   4. Fallback: chave 0 ou primeira disponível
        let desc: string | undefined = nodeData.description;
        if (!desc && cpSkillDesc[nodeId]) {
          const nodeDescMap: Record<string, string> = cpSkillDesc[nodeId];
          const points = nodeData.points;
          if (points !== undefined) {
            desc = nodeDescMap[points] ?? nodeDescMap[String(points)];
            if (!desc) {
              // floor lookup
              const floorKey = Object.keys(nodeDescMap)
                .map(Number)
                .filter((p) => p <= points)
                .sort((a, b) => b - a)[0];
              if (floorKey !== undefined)
                desc = nodeDescMap[floorKey] ?? nodeDescMap[String(floorKey)];
            }
          }
          if (!desc) {
            desc = nodeDescMap[0] ?? nodeDescMap['0'] ?? (Object.values(nodeDescMap)[0] as string);
          }
        }

        if (desc) {
          // Strip HTML tags so the engine's regex matching works on plain text
          const plainDesc = desc.replace(/<[^>]+>/g, '');
          cpDataGlobal[nodeId] = { type: 'skill', isUnlocked: true, description: plainDesc, name };
        }
        // sem descrição resolvível → node ignorado (sem efeito no motor)
      } else {
        // caminho legado: injeção DOM para ParseEsoCP2Value
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
  // PASSO 3b: Habilita buffs ativos.
  //
  // g_EsoBuildBuffData é um Proxy que auto-cria entradas.
  // Setar .enabled = true é suficiente para IsEsoBuffEnabled() retornar true.
  // Reseta todos os buffs antes para evitar bleed-through entre chamadas.
  // -------------------------------------------------------------------------
  const buffData: any = (global as any).g_EsoBuildBuffData;
  if (buffData && typeof buffData === 'object') {
    for (const key of Object.keys(buffData)) {
      const b = buffData[key];
      if (b && typeof b === 'object') {
        b.enabled = false;
        b.skillEnabled = false;
        b.buffEnabled = false;
        b.combatEnabled = false;
      }
    }
  }
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
  // PASSO 3c: Habilita toggle skills.
  //
  // IsEsoBuildToggledSkillEnabled() verifica: skillData.valid && skillData.enabled
  // Reseta todos os toggles antes para evitar bleed-through entre chamadas.
  // -------------------------------------------------------------------------
  const toggleSkillData: any = (global as any).g_EsoBuildToggledSkillData;
  if (toggleSkillData && typeof toggleSkillData === 'object') {
    for (const key of Object.keys(toggleSkillData)) {
      const s = toggleSkillData[key];
      if (s && typeof s === 'object') {
        s.enabled = false;
        s.combatEnabled = false;
      }
    }
  }
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
  // PASSO 3d: Injeta skill bars em g_EsoSkillBarData.
  //
  // O motor usa g_EsoSkillBarData para detectar skill lines ativas e aplicar
  // passivos condicionais (ex: passivos de Destruction Staff, set bonuses que
  // afetam "Class abilities", etc.).
  //
  // LIMITAÇÃO ATUAL: sem g_SkillsData no uesp-init-data.json, os skill IDs são
  // injetados mas os passivos de skill line não geram stats. Será funcional
  // quando g_SkillsData for adicionado ao JSON de extração.
  // -------------------------------------------------------------------------
  const emptySkillSlot = () => ({ skillId: 0, origSkillId: 0, morphIndex: 0, slotIndex: 0 });
  const emptyBar = () =>
    Array.from({ length: 6 }, (_, i) => ({ ...emptySkillSlot(), slotIndex: i }));
  (global as any).g_EsoSkillBarData = [emptyBar(), emptyBar()];

  if (skillBars) {
    const barMap: [typeof skillBars.bar1, 0 | 1][] = [
      [skillBars.bar1, 0],
      [skillBars.bar2, 1],
    ];
    for (const [slots, barIndex] of barMap) {
      if (!slots) continue;
      slots.slice(0, 6).forEach((slot, slotIndex) => {
        (global as any).g_EsoSkillBarData[barIndex][slotIndex] = {
          skillId: slot.skillId,
          origSkillId: slot.skillId,
          morphIndex: slot.morphIndex ?? 0,
          slotIndex,
        };
      });
    }
  }

  // -------------------------------------------------------------------------
  // PASSO 3e: Define qual barra de armas está ativa.
  //
  // g_EsoBuildActiveWeapon determina quais slots MainHand/OffHand contam para
  // set bonuses, enchants e efeitos condicionais de arma.
  // -------------------------------------------------------------------------
  (global as any).g_EsoBuildActiveWeapon = activeWeaponBar ?? 1;

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
        'Certifique-se de chamar initEsoEngine() antes de calculateBuild().',
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
    Health: raw['Health'] ?? 0,
    Magicka: raw['Magicka'] ?? 0,
    Stamina: raw['Stamina'] ?? 0,

    // Regeneração
    HealthRegen: raw['HealthRegen'] ?? 0,
    MagickaRegen: raw['MagickaRegen'] ?? 0,
    StaminaRegen: raw['StaminaRegen'] ?? 0,

    // Dano
    WeaponDamage: raw['WeaponDamage'] ?? 0,
    SpellDamage: raw['SpellDamage'] ?? 0,

    // Crítico
    WeaponCrit: raw['WeaponCrit'] ?? 0,
    SpellCrit: raw['SpellCrit'] ?? 0,
    SpellCritDamage: raw['SpellCritDamage'] ?? 0,
    WeaponCritDamage: raw['WeaponCritDamage'] ?? 0,

    // Resistências
    PhysicalResist: raw['PhysicalResist'] ?? 0,
    SpellResist: raw['SpellResist'] ?? 0,
    CritResist: raw['CritResist'] ?? 0,

    // Penetração
    PhysicalPenetration: raw['PhysicalPenetration'] ?? 0,
    SpellPenetration: raw['SpellPenetration'] ?? 0,

    // Poder efetivo
    EffectiveSpellPower: raw['EffectiveSpellPower'] ?? 0,
    EffectiveWeaponPower: raw['EffectiveWeaponPower'] ?? 0,
    EffectivePower: raw['EffectivePower'] ?? 0,

    // Cura
    HealingDone: raw['HealingDone'] ?? 0,
    HealingTaken: raw['HealingTaken'] ?? 0,

    // Velocidade
    RunSpeed: raw['RunSpeed'] ?? 0,
    SprintSpeed: raw['SprintSpeed'] ?? 0,

    // Mitigação
    AttackSpellMitigation: raw['AttackSpellMitigation'] ?? 0,
    AttackPhysicalMitigation: raw['AttackPhysicalMitigation'] ?? 0,
    DefenseSpellMitigation: raw['DefenseSpellMitigation'] ?? 0,
    DefensePhysicalMitigation: raw['DefensePhysicalMitigation'] ?? 0,

    raw,
  };
}
