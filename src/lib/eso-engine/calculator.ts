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
import type { BuffInfo, BuildInput, ComputedStats, EquipSlot, PassiveSkillInfo, SkillSlot, ToggleSkillInfo, UespItemApiData } from './types';

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
function normalizeItemData(item: UespItemApiData): UespItemApiData {
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
    passiveSkills,
    autoPassives,
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
  // Segunda Pedra de Mundus (requer set Twice-Born Star ou será ativada diretamente).
  // IsTwiceBornStarEnabled() lê a flag _esoWrapperTwiceBornOverride (patch em loader.ts)
  // quando o set não está equipado mas mundusStone2 é fornecido explicitamente.
  (global as any)._esoWrapperTwiceBornOverride = !!character.mundusStone2;
  if (character.mundusStone2) {
    setDomValue('esotbMundus2', character.mundusStone2);
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
  const emptyBar = () =>
    Array.from({ length: 6 }, (_, i) => ({ skillId: 0, origSkillId: 0, morphIndex: 0, slotIndex: i }));
  (global as any).g_EsoSkillBarData = [emptyBar(), emptyBar()];

  if (skillBars) {
    const barMap: [SkillSlot[] | undefined, 0 | 1][] = [
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
  // PASSO 3d-2: Popula g_EsoSkillPassiveData com os passivos do personagem.
  //
  // O engine itera g_EsoSkillPassiveData em GetEsoInputSkillPassives e aplica
  // cada passivo via regex no texto da descrição (ESO_PASSIVEEFFECT_MATCHES).
  // Requer g_SkillsData + GetEsoSkillDescription (de esoskills.js).
  //
  // Cada entrada: { abilityId } — o engine busca g_SkillsData[abilityId] para
  // obter coeficientes e gerar a descrição do passivo.
  // -------------------------------------------------------------------------
  (global as any).g_EsoSkillPassiveData = {};
  const allPassiveIds = new Set<number>(passiveSkills ?? []);
  if (autoPassives) {
    // Use the loader snapshot (written before any calculations) to avoid raceType mutation.
    const snapshot: any = (global as any).g_EsoPassiveSkillSnapshot;
    if (snapshot) {
      for (const v of Object.values(snapshot) as any[]) {
        if (!v) continue;
        if (
          (v.raceType === character.race || v.classType === character.class) &&
          (v.nextSkill === -1 || String(v.nextSkill) === '-1')
        ) {
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
    (global as any).g_EsoSkillPassiveData = passiveData;
  }

  // -------------------------------------------------------------------------
  // PASSO 3d-3: Popula g_EsoSkillActiveData a partir das skill bars.
  //
  // GetEsoInputSkillActiveBar lê g_EsoSkillBarData[barra][slot].origSkillId e
  // busca g_EsoSkillActiveData[origSkillId].abilityId para obter a descrição.
  // Populamos automaticamente para todos os slots não-vazios das barras.
  // -------------------------------------------------------------------------
  (global as any).g_EsoSkillActiveData = {};
  if (skillBars) {
    const activeData: Record<number, { abilityId: number }> = {};
    const bars = [skillBars.bar1, skillBars.bar2];
    for (const bar of bars) {
      if (!bar) continue;
      for (const slot of bar) {
        if (slot.skillId) activeData[slot.skillId] = { abilityId: slot.skillId };
      }
    }
    (global as any).g_EsoSkillActiveData = activeData;
  }

  // -------------------------------------------------------------------------
  // PASSO 3e: Define qual barra de armas está ativa.
  //
  // g_EsoBuildActiveWeapon determina quais slots MainHand/OffHand contam para
  // set bonuses, enchants e efeitos condicionais de arma.
  // -------------------------------------------------------------------------
  (global as any).g_EsoBuildActiveWeapon = activeWeaponBar ?? 1;

  // -------------------------------------------------------------------------
  // PASSO 4: Executa o cálculo.
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
  // PASSO 5: Lê os resultados de g_EsoComputedStats[statId].value
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

/**
 * Returns the catalog of buffs available in the loaded UESP engine.
 *
 * Each entry maps to one row in the UESP buff tab. Pass `entry.name` to
 * `BuildInput.activeBuffs` to enable that buff in a calculation.
 *
 * Must be called after `initEsoEngine()`.
 *
 * @param group - Optional filter. Ex: "Major", "Minor", "Set", "Target",
 *   "Skill", "Potion", "Poison", "Cyrodiil", "Other".
 *   Omit to return all 164 buffs.
 */
export function listAvailableBuffs(group?: string): BuffInfo[] {
  const buffData: any = (global as any).g_EsoBuildBuffData;
  if (!buffData || typeof buffData !== 'object') return [];

  const result: BuffInfo[] = [];

  for (const [name, entry] of Object.entries(buffData) as [string, any][]) {
    if (!entry || typeof entry !== 'object') continue;

    const entryGroup: string = entry.group ?? entry.groupName ?? '';
    if (group !== undefined && entryGroup !== group) continue;

    const effects = (Array.isArray(entry.effects) ? entry.effects : []).map((fx: any) => ({
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
  filter: (v: any) => boolean,
  sortKey: (v: any) => string,
): PassiveSkillInfo[] {
  const snapshot: any = (global as any).g_EsoPassiveSkillSnapshot;
  if (!snapshot || typeof snapshot !== 'object') return [];

  return (Object.values(snapshot) as any[])
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
 * Must be called after initEsoEngine().
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
 * Must be called after initEsoEngine().
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
 * Must be called after initEsoEngine().
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
 * Must be called after initEsoEngine().
 */
export function listAvailableSkillLines(): string[] {
  const snapshot: any = (global as any).g_EsoPassiveSkillSnapshot;
  if (!snapshot || typeof snapshot !== 'object') return [];

  const lines = new Set<string>();
  for (const v of Object.values(snapshot) as any[]) {
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
 * Must be called after initEsoEngine().
 */
export function listAvailableToggleSkills(): ToggleSkillInfo[] {
  const toggleData: any = (global as any).g_EsoBuildToggledSkillData;
  if (!toggleData || typeof toggleData !== 'object') return [];

  const result: ToggleSkillInfo[] = [];

  for (const [name, entry] of Object.entries(toggleData) as [string, any][]) {
    if (!entry || typeof entry !== 'object') continue;
    if (!name) continue; // skip anonymous entries (no nameId in the rule)

    const matchData: any = entry.matchData ?? {};
    const effects = (Array.isArray(matchData.effects) ? matchData.effects : []).map((fx: any) => ({
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
