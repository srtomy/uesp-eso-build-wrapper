/**
 * Carrega os scripts da UESP no contexto global do Node.js via vm.runInThisContext.
 *
 * Por que vm.runInThisContext e não require()?
 * - Os scripts da UESP não exportam módulos: definem funções e variáveis em window.*.
 * - require() registra o módulo no cache e isola o escopo — as funções UESP não
 *   ficariam visíveis como globais.
 * - vm.runInThisContext executa o código JS no contexto global REAL do processo Node,
 *   garantindo que window.GetEsoInputValues, window.UpdateEsoComputedStatsList_Real, etc.,
 *   fiquem disponíveis como globais acessíveis por qualquer módulo.
 *
 * IMPORTANTE: setupNodeEnvironment() deve ser chamado ANTES desta função.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import type { UespInitData } from './types';

let engineLoaded = false;

/**
 * Carrega e inicializa o motor da UESP.
 *
 * @param uespResourcesPath - Caminho para a pasta resources/ do fork da UESP.
 *   Ex: path.resolve(__dirname, '../../../vendor/uesp-esochardata/resources')
 * @param initData
 *   Ex: path.resolve(__dirname, '../../../vendor/uesp-data/uesp-init-data.json')
 */
export function loadUespEngine(uespResourcesPath: string, initData: string | UespInitData): void {
  if (engineLoaded) return; // singleton — carrega apenas uma vez por processo

  // 1. Resolve o JSON de inicialização — caminho de arquivo ou objeto já parseado.
  let data: UespInitData;
  if (typeof initData === 'string') {
    if (!fs.existsSync(initData)) {
      throw new Error(
        `[eso-engine] Arquivo de inicialização não encontrado: ${initData}\n` +
          `Execute o script de extração no browser e salve o resultado neste caminho.\n` +
          `Consulte: vendor/uesp-data/browser-extract.js`,
      );
    }
    data = JSON.parse(fs.readFileSync(initData, 'utf-8')) as UespInitData;
  } else {
    data = initData;
  }

  // 2. Injeta os dados de fórmulas como globais ANTES de carregar o script.
  //    O script da UESP referencia g_EsoComputedStats, g_EsoInputStats, etc. como globais.
  (global as any).g_EsoComputedStats = data.computedStats ?? {};
  (global as any).g_EsoInputStats = data.inputStats ?? {};
  (global as any).g_EsoInitialBuffData = data.buffData ?? {};
  (global as any).g_EsoInitialCpData = data.cpData ?? {};
  (global as any).g_EsoBuildRules = data.buildRules ?? {};
  (global as any).g_EsoBuildRulesVersion = 'Live';
  (global as any).g_EsoBuildLiveVersion = 'Live';
  (global as any).g_EsoBuildPtsVersion = 'PTS';

  // Metadados dos nodes CP2 — injetados como globais para que calculator.ts
  // possa resolver nomes e descrições dinamicamente sem hardcoding.
  (global as any).g_EsoCpSkills = data.cpSkillsData ?? {};
  (global as any).g_EsoCpSkillDesc = data.cpSkillDescData ?? {};

  // Globals que vêm do PHP/DB — inicializados como objetos vazios para que
  // loops "for (var id in g_SkillsData)" não quebrem
  (global as any).g_SkillsData = data.skillsData ?? {};
  (global as any).g_SetSkillsData = data.setSkillsData ?? {};
  (global as any).g_LastSkillInputValues = {};

  // Globals de estado da build — injetados pelo PHP, precisam de defaults seguros
  (global as any).g_EsoBuildActiveWeapon = 1; // 1=barra de armas principal
  (global as any).g_EsoBuildActiveAbilityBar = 1;
  (global as any).g_EsoBuildAlternateVersion = '';
  (global as any).g_EsoBuildCp = {};
  (global as any).g_EsoBuildData = {};
  (global as any).g_EsoBuildLastSetIndex = 0;
  (global as any).g_EsoBuildSetNames = {};

  // Barra de habilidades — array de 2 barras (principal + offbar), cada uma com 6 slots.
  // O script acessa g_EsoSkillBarData[0][5].origSkillId diretamente (linha 10239).
  const emptySkillSlot = () => ({ skillId: 0, origSkillId: 0, morphIndex: 0, slotIndex: 0 });
  const emptySkillBar = () => Array.from({ length: 6 }, emptySkillSlot);
  (global as any).g_EsoSkillBarData = [emptySkillBar(), emptySkillBar()];
  (global as any).g_EsoSkillActiveData = {};
  (global as any).g_EsoSkillPassiveData = {};

  // Objetos que precisam ser {} para que acessos do tipo obj[key] retornem undefined
  // ao invés de lançar TypeError ("Cannot read properties of undefined")
  (global as any).g_EsoCpData = {};
  (global as any).g_EsoBuildEnchantData = {};
  (global as any).g_EsoBuildItemData = {};
  (global as any).g_EsoBuildSetData = {};
  (global as any).g_EsoBuildAllSetData = {};
  // g_EsoBuildRules já foi injetado acima a partir de data.buildRules — não sobrescrever aqui.
  (global as any).g_EsoInitialItemData = {};

  // 3. Pré-declara todos os g_* globais como undefined no contexto Node.js.
  //    No browser, variáveis globais não declaradas retornam undefined quando lidas.
  //    No Node.js com vm.runInThisContext elas lançam ReferenceError.
  //    Pre-declarar garante comportamento compatível com o browser.
  const ALL_GLOBALS = [
    'g_EsoBuildActiveAbilityBar',
    'g_EsoBuildActiveWeapon',
    'g_EsoBuildAllSetData',
    'g_EsoBuildAlternateVersion',
    'g_EsoBuildBuffData',
    'g_EsoBuildBuffData_PTS',
    'g_EsoBuildClickWallLinkElement',
    'g_EsoBuildComputedStatParent',
    'g_EsoBuildCp2NextRuleId',
    'g_EsoBuildCp2RuleVersion',
    'g_EsoBuildData',
    'g_EsoBuildDumpSetData',
    'g_EsoBuildEnableUpdates',
    'g_EsoBuildEnchantData',
    'g_EsoBuildItemData',
    'g_EsoBuildLastInputHistory',
    'g_EsoBuildLastInputValues',
    'g_EsoBuildLastSetIndex',
    'g_EsoBuildLastUpdateRequest',
    'g_EsoBuildLiveVersion',
    'g_EsoBuildPtsVersion',
    'g_EsoBuildRebuildStatFlag',
    'g_EsoBuildRules',
    'g_EsoBuildRulesVersion',
    'g_EsoBuildSetCachedRules',
    'g_EsoBuildSetData',
    'g_EsoBuildSetMaxData',
    'g_EsoBuildSetNames',
    'g_EsoBuildSubclassCurrentClass',
    'g_EsoBuildSubclassCurrentElement',
    'g_EsoBuildSubclassCurrentSkillIndex',
    'g_EsoBuildSubclassCurrentSkillLine',
    'g_EsoBuildSubclassData',
    'g_EsoBuildTestSets',
    'g_EsoBuildTestSkills',
    'g_EsoBuildToggledCpData',
    'g_EsoBuildToggledSetData',
    'g_EsoBuildToggledSkillData',
    'g_EsoBuildUpdatedOffBarEnchantFactor',
    'g_EsoCharDataTimeUpdateId',
    'g_EsoComputedStats',
    'g_EsoCpData',
    'g_EsoCraftedSkills',
    'g_EsoCurrentTooltipSlot',
    'g_EsoFormulaInputValues',
    'g_EsoGearIcons',
    'g_EsoGoodActiveMatches',
    'g_EsoGoodActiveMatchesString',
    'g_EsoGoodPassiveMatches',
    'g_EsoGoodPassiveMatchesString',
    'g_EsoGoodSetMatches',
    'g_EsoInitialBuffData',
    'g_EsoInitialEnchantData',
    'g_EsoInitialItemData',
    'g_EsoInitialSetMaxData',
    'g_EsoInitialToggleCpData',
    'g_EsoInitialToggleSetData',
    'g_EsoInitialToggleSkillData',
    'g_EsoInputStatDetails',
    'g_EsoInputStats',
    'g_EsoInputStatSources',
    'g_EsoLoadedAllSetData',
    'g_EsoProfileData',
    'g_EsoSkillActiveData',
    'g_EsoSkillBarData',
    'g_EsoSkillDestructionData',
    'g_EsoSkillDestructionElement',
    'g_EsoSkillDestructionElementPrev',
    'g_EsoSkillDestructionOffHandElement',
    'g_EsoSkillIsMobile',
    'g_EsoSkillPassiveData',
    'g_EsoSkillPointsUsed',
    'g_EsoToggleSkillUsedBuffer',
    'g_LastSkillInputValues',
    'g_SetSkillsData',
    'g_SkillsData',
    'g_EsoCpSkills',
    'g_EsoCpSkillDesc',
    // Globais lidos por esoskills.js mas definidos externamente (PHP/backend)
    'g_EsoCraftedScripts',
    'g_EsoSkillElfBaneSkills',
    'g_EsoSkillFlameAOESkills',
    'g_EsoSkillHasV2Tooltips',
    'g_EsoSkillPoisonSkills',
    'g_SkillSearchIds',
    'g_SkillShowAll',
    'g_SkillUseUpdate10Cost',
    'g_SkillsVersion',
  ];
  for (const name of ALL_GLOBALS) {
    if (!(name in global)) {
      (global as any)[name] = undefined;
    }
  }

  // 4. Carrega os scripts da UESP via vm.runInThisContext.
  //    Ordem: esoskills.js (descrições) → esobuilddata.js (dados estáticos) → esoEditBuild.js (motor)
  //    esoEditBuild.js sobrescreve GetEsoSkillInputValues na inicialização, por isso esoskills.js
  //    precisa ser carregado primeiro.
  //
  //    esoskills.js está em vendor/uesp-esolog/resources/esoskills.js (submodule uesp/uesp-esolog).
  //    Se o arquivo não existir, o motor funciona sem cálculo de skill passivos/ativos.
  const esoskillsPath = path.join(
    path.dirname(path.dirname(uespResourcesPath)),
    'uesp-esolog',
    'resources',
    'esoskills.js',
  );
  if (fs.existsSync(esoskillsPath)) {
    // USE_V2_TOOLTIPS=true é setado no esoskills.js, mas GetEsoSkillDescription2 não existe no
    // nosso ambiente — a verificação tripla (USE_V2_TOOLTIPS && g_EsoSkillHasV2Tooltips && GetEsoSkillDescription2)
    // falhará em g_EsoSkillHasV2Tooltips, caindo no caminho V1 automaticamente.
    (global as any).g_EsoSkillHasV2Tooltips = false;
    vm.runInThisContext(fs.readFileSync(esoskillsPath, 'utf-8'), { filename: esoskillsPath });
  } else {
    console.warn('[eso-engine] esoskills.js não encontrado — skill passivos/ativos desabilitados.');
    console.warn(
      '[eso-engine] Execute: git submodule add git@github.com:uesp/uesp-esolog.git vendor/uesp-esolog',
    );
  }

  const dataScriptPath = path.join(uespResourcesPath, 'esobuilddata.js');
  if (!fs.existsSync(dataScriptPath)) {
    throw new Error(`[eso-engine] Script de dados da UESP não encontrado: ${dataScriptPath}`);
  }
  vm.runInThisContext(fs.readFileSync(dataScriptPath, 'utf-8'), { filename: dataScriptPath });

  const scriptPath = path.join(uespResourcesPath, 'esoEditBuild.js');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`[eso-engine] Script da UESP não encontrado: ${scriptPath}`);
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  vm.runInThisContext(scriptContent, { filename: scriptPath });

  // 5. Pós-carregamento: envolve g_EsoBuildBuffData em um Proxy de segurança.
  //    O motor acessa g_EsoBuildBuffData['Battle Spirit'].visible, etc.
  //    Se os dados reais de buff não foram extraídos do browser, o objeto está vazio
  //    e o acesso quebraria. O Proxy auto-cria uma entrada segura para qualquer chave.
  //
  //    Também patchamos `.name` em entradas existentes que só têm `.nameId`:
  //    EsoBuildCreateBuffDataFromRules() (linha 14337 do motor) popula g_EsoBuildBuffData
  //    com 164+ entradas contendo .nameId mas sem .name. CountEsoMajorMinorBuffs (linha 3283)
  //    chama .name.startsWith("Major ") em todas as entradas → TypeError sem esse patch.
  const rawBuffData = (global as any).g_EsoBuildBuffData ?? {};
  for (const [key, entry] of Object.entries(rawBuffData) as [string, any][]) {
    if (entry && typeof entry === 'object' && !entry.name) {
      entry.name = entry.nameId ?? key;
    }
  }
  (global as any).g_EsoBuildBuffData = new Proxy(rawBuffData, {
    get(target, prop: string) {
      if (!(prop in target)) {
        target[prop] = {
          name: prop,
          visible: false,
          enabled: false,
          skillEnabled: false,
          rawOutput: {},
          skillAbilities: [],
        };
      }
      return target[prop];
    },
  });

  // 6. Patch IsTwiceBornStarEnabled para suportar character.mundusStone2.
  //
  //     A função original checa g_EsoInputStatSources.TwiceBornStar, que só é
  //     populado quando os 5 itens do set "Twice-Born Star" estão equipados.
  //     Adicionamos uma saída rápida que verifica a flag _esoWrapperTwiceBornOverride
  //     (setada por calculator.ts quando character.mundusStone2 está presente).
  const _origIsTwiceBorn = (global as any).IsTwiceBornStarEnabled;
  if (typeof _origIsTwiceBorn === 'function') {
    (global as any).IsTwiceBornStarEnabled = function () {
      if ((global as any)._esoWrapperTwiceBornOverride) return true;
      return _origIsTwiceBorn.call(this);
    };
  }

  // 7. Patch UpdateEsoBuildToggledSkillData para preservar o estado enabled.
  //
  //    O motor usa $("#esotbToggledSkillInfo").find(...).is(":checked") para ler
  //    checkboxes de toggle skills. No Node.js o mock jQuery não tem DOM real, então
  //    checkElement.length = 1 (mock) e .is(":checked") retorna um proxy chain.
  //    Isso faz SetEsoBuildToggledSkillEnable(skillId, falsyValue) sobrescrever o
  //    enabled=true que calculator.ts setou antes do cálculo.
  //
  //    Fix: salva enabled[] antes da chamada original e restaura depois — preserva
  //    o estado programático sem afetar a lógica de validação (.valid) do motor.
  const _origUpdateToggledSkill = (global as any).UpdateEsoBuildToggledSkillData;
  if (typeof _origUpdateToggledSkill === 'function') {
    (global as any).UpdateEsoBuildToggledSkillData = function (inputValues: any) {
      const toggleData: any = (global as any).g_EsoBuildToggledSkillData ?? {};
      const savedEnabled: Record<string, boolean> = {};
      for (const k of Object.keys(toggleData)) {
        savedEnabled[k] = !!toggleData[k]?.enabled;
      }
      _origUpdateToggledSkill.call(this, inputValues);
      for (const k of Object.keys(savedEnabled)) {
        if (toggleData[k]) toggleData[k].enabled = savedEnabled[k];
      }
    };
  }

  // 8. Patch RemoveEsoDescriptionFormats para normalizar \n → espaço.
  //
  //    O buildRules.passive/.active foi gerado com a versão atual das descrições do
  //    UESP (que usa espaços entre itens de lista, ex: "38% 2 Keeps: 45%").
  //    O g_SkillsData extraído do browser usa \n entre os itens de lista
  //    (ex: "38%\n2 Keeps: 45%"). A normalização garante que os regexes do motor
  //    batam com ambos os formatos sem necessidade de re-extração.
  //
  //    Impacto verificado: as 49 regras que já funcionam continuam funcionando;
  //    as 10 que falhavam por \n (Emperor, Authority, Domination, Tactician, etc.)
  //    passam a funcionar.
  const _origRemoveFmt = (global as any).RemoveEsoDescriptionFormats;
  if (typeof _origRemoveFmt === 'function') {
    (global as any).RemoveEsoDescriptionFormats = function (text: string) {
      const stripped: string = _origRemoveFmt(text);
      return stripped ? stripped.replace(/\n/g, ' ') : stripped;
    };
  }

  // 9. Snapshot dos passivos raciais e de classe ANTES de qualquer cálculo.
  //    O motor muta g_SkillsData[id].raceType durante cálculos (p.ex., ao processar
  //    a raça do personagem, ele reatribui raceType em skills de outras raças).
  //    Snapshotamos aqui, com os dados limpos do JSON de inicialização, para que
  //    listRacialPassives/listClassPassives/autoPassives sejam sempre corretos.
  const passiveSnapshot: Record<string, any> = {};
  const rawSkillsData = (global as any).g_SkillsData ?? {};
  for (const [id, skill] of Object.entries(rawSkillsData) as [string, any][]) {
    if (!skill || skill.isPassive !== '1') continue;
    // Inclui racial, classe e skill lines nomeadas (armadura, armas, guildas, etc.)
    // Exclui passivos sem agrupamento útil (sem raceType, classType nem skillLine).
    if (!skill.raceType && !skill.classType && !skill.skillLine) continue;
    passiveSnapshot[id] = {
      abilityId: skill.abilityId ?? Number(id),
      name: skill.name ?? '',
      baseName: skill.baseName ?? skill.name ?? '',
      rank: Number(skill.rank ?? 1),
      maxRank: Number(skill.maxRank ?? 1),
      nextSkill: skill.nextSkill,
      skillLine: skill.skillLine ?? '',
      description: skill.description ?? '',
      icon: skill.icon ?? '',
      raceType: skill.raceType ?? '',
      classType: skill.classType ?? '',
    };
  }
  (global as any).g_EsoPassiveSkillSnapshot = passiveSnapshot;

  engineLoaded = true;
}

/** Permite recarregar o motor (útil em testes) */
export function resetEngineLoader(): void {
  engineLoaded = false;
}
