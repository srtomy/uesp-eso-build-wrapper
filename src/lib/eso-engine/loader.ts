/**
 * Loads the UESP scripts into the Node.js global context via vm.runInThisContext.
 *
 * Why vm.runInThisContext and not require()?
 * - The UESP scripts don't export modules: they define functions and variables on window.*.
 * - require() registers the module in the cache and isolates the scope — the UESP
 *   functions would not become visible as globals.
 * - vm.runInThisContext runs the JS code in the process's REAL global Node context,
 *   ensuring window.GetEsoInputValues, window.UpdateEsoComputedStatsList_Real, etc.
 *   are available as globals accessible from any module.
 *
 * IMPORTANT: setupNodeEnvironment() must be called BEFORE this function.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import type { UespInitData } from './types.js';
import { buildInputStats } from './input-stats.js';

let engineLoaded = false;

/**
 * Loads and initializes the UESP engine.
 *
 * @param uespResourcesPath - Path to the UESP fork's resources/ folder.
 *   E.g. path.resolve(import.meta.dirname, '../../../vendor/uesp-esochardata/resources')
 * @param initData
 *   E.g. path.resolve(import.meta.dirname, '../../../vendor/uesp-data/uesp-init-data.json')
 */
export function loadUespEngine(uespResourcesPath: string, initData: string | UespInitData): void {
  if (engineLoaded) return; // singleton — loads only once per process

  // 1. Resolve the init JSON — file path or already-parsed object.
  let data: UespInitData;
  if (typeof initData === 'string') {
    if (!fs.existsSync(initData)) {
      throw new Error(
        `[eso-engine] Initialization file not found: ${initData}\n` +
          `Run the browser extraction script and save the result to this path.\n` +
          `See: vendor/uesp-data/browser-extract.js`,
      );
    }
    data = JSON.parse(fs.readFileSync(initData, 'utf-8')) as UespInitData;
  } else {
    data = initData;
  }

  // 2. Inject the formula data as globals BEFORE loading the script.
  //    The UESP script references g_EsoComputedStats, g_EsoInputStats, etc. as globals.
  //    The JSON insertion order must be preserved: UESP processes deferredStats in
  //    insertion order, and stats like BashDamage (JSON pos 51) must come before
  //    DirectDamageDone (JSON pos 71) to replicate browser behavior.
  (global as any).g_EsoComputedStats = data.computedStats ?? {};
  (global as any).g_EsoInputStats = buildInputStats();
  (global as any).g_EsoInitialBuffData = data.buffData ?? {};
  (global as any).g_EsoInitialCpData = data.cpData ?? {};
  (global as any).g_EsoBuildRules = data.buildRules ?? {};
  (global as any).g_EsoBuildRulesVersion = 'Live';
  (global as any).g_EsoBuildLiveVersion = 'Live';
  (global as any).g_EsoBuildPtsVersion = 'PTS';

  // CP2 node metadata — injected as globals so calculator.ts
  // can resolve names and descriptions dynamically without hardcoding.
  (global as any).g_EsoCpSkills = data.cpSkillsData ?? {};
  (global as any).g_EsoCpSkillDesc = data.cpSkillDescData ?? {};

  // Globals coming from PHP/DB — initialized as empty objects so that
  // loops like "for (var id in g_SkillsData)" don't break
  (global as any).g_SkillsData = data.skillsData ?? {};
  (global as any).g_SetSkillsData = data.setSkillsData ?? {};
  (global as any).g_LastSkillInputValues = {};

  // Build state globals — injected by PHP, need safe defaults
  (global as any).g_EsoBuildActiveWeapon = 1; // 1=main weapon bar
  (global as any).g_EsoBuildActiveAbilityBar = 1;
  (global as any).g_EsoBuildAlternateVersion = '';
  (global as any).g_EsoBuildCp = {};
  (global as any).g_EsoBuildData = {};
  (global as any).g_EsoBuildLastSetIndex = 0;
  (global as any).g_EsoBuildSetNames = {};

  // Skill bars — array of 2 bars (main + offbar), each with 6 slots.
  // The script accesses g_EsoSkillBarData[0][5].origSkillId directly (line 10239).
  const emptySkillSlot = () => ({ skillId: 0, origSkillId: 0, morphIndex: 0, slotIndex: 0 });
  const emptySkillBar = () => Array.from({ length: 6 }, emptySkillSlot);
  (global as any).g_EsoSkillBarData = [emptySkillBar(), emptySkillBar()];
  (global as any).g_EsoSkillActiveData = {};
  (global as any).g_EsoSkillPassiveData = {};

  // Objects that must be {} so accesses like obj[key] return undefined
  // instead of throwing TypeError ("Cannot read properties of undefined")
  (global as any).g_EsoCpData = {};
  (global as any).g_EsoBuildEnchantData = {};
  (global as any).g_EsoBuildItemData = {};
  (global as any).g_EsoBuildSetData = {};
  (global as any).g_EsoBuildAllSetData = {};
  // g_EsoBuildRules was already injected above from data.buildRules — don't overwrite here.
  (global as any).g_EsoInitialItemData = {};

  // 3. Pre-declare all g_* globals as undefined in the Node.js context.
  //    In the browser, undeclared globals return undefined when read.
  //    In Node.js with vm.runInThisContext they throw ReferenceError.
  //    Pre-declaring ensures browser-compatible behavior.
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
    // Globals read by esoskills.js but defined externally (PHP/backend)
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

  // 4. Load the UESP scripts via vm.runInThisContext.
  //    Order: esoskills.js (descriptions) → esobuilddata.js (static data) → esoEditBuild.js (engine)
  //    esoEditBuild.js overrides GetEsoSkillInputValues on init, so esoskills.js
  //    must be loaded first.
  //
  //    esoskills.js lives in vendor/uesp-esolog/resources/esoskills.js (uesp/uesp-esolog submodule).
  //    If the file doesn't exist, the engine works without passive/active skill calculation.
  const esoskillsPath = path.join(
    path.dirname(path.dirname(uespResourcesPath)),
    'uesp-esolog',
    'resources',
    'esoskills.js',
  );
  if (fs.existsSync(esoskillsPath)) {
    // USE_V2_TOOLTIPS=true is set in esoskills.js, but GetEsoSkillDescription2 doesn't exist in
    // our environment — the triple check (USE_V2_TOOLTIPS && g_EsoSkillHasV2Tooltips && GetEsoSkillDescription2)
    // fails on g_EsoSkillHasV2Tooltips, falling back to the V1 path automatically.
    (global as any).g_EsoSkillHasV2Tooltips = false;
    vm.runInThisContext(fs.readFileSync(esoskillsPath, 'utf-8'), { filename: esoskillsPath });
  } else {
    console.warn('[eso-engine] esoskills.js not found — skill passives/actives disabled.');
    console.warn(
      '[eso-engine] Run: git submodule add git@github.com:uesp/uesp-esolog.git vendor/uesp-esolog',
    );
  }

  const dataScriptPath = path.join(uespResourcesPath, 'esobuilddata.js');
  if (!fs.existsSync(dataScriptPath)) {
    throw new Error(
      `[eso-engine] Vendor script not found: ${dataScriptPath}\n` +
        `If you are using Next.js or a serverless environment, vendor files must be explicitly included in the deployment bundle.\n` +
        `See: https://github.com/srtomy/uesp-eso-build-wrapper#framework-integration`,
    );
  }
  vm.runInThisContext(fs.readFileSync(dataScriptPath, 'utf-8'), { filename: dataScriptPath });

  const scriptPath = path.join(uespResourcesPath, 'esoEditBuild.js');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`[eso-engine] UESP script not found: ${scriptPath}`);
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  vm.runInThisContext(scriptContent, { filename: scriptPath });

  // 5. Post-load: wrap g_EsoBuildBuffData in a safety Proxy.
  //    The engine accesses g_EsoBuildBuffData['Battle Spirit'].visible, etc.
  //    If the real buff data wasn't extracted from the browser, the object is empty
  //    and access would break. The Proxy auto-creates a safe entry for any key.
  //
  //    We also patch `.name` on existing entries that only have `.nameId`:
  //    EsoBuildCreateBuffDataFromRules() (engine line 14337) populates g_EsoBuildBuffData
  //    with 164+ entries containing .nameId but no .name. CountEsoMajorMinorBuffs (line 3283)
  //    calls .name.startsWith("Major ") on every entry → TypeError without this patch.
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

  // 6. Patch IsTwiceBornStarEnabled to support character.mundusStone2.
  //
  //     The original function checks g_EsoInputStatSources.TwiceBornStar, which is only
  //     populated when all 5 "Twice-Born Star" set pieces are equipped.
  //     We add a fast path checking the _esoWrapperTwiceBornOverride flag
  //     (set by calculator.ts when character.mundusStone2 is present).
  const _origIsTwiceBorn = (global as any).IsTwiceBornStarEnabled;
  if (typeof _origIsTwiceBorn === 'function') {
    (global as any).IsTwiceBornStarEnabled = function () {
      if ((global as any)._esoWrapperTwiceBornOverride) return true;
      return _origIsTwiceBorn.call(this);
    };
  }

  // 7. Patch UpdateEsoBuildToggledSkillData to preserve the enabled state.
  //
  //    The engine uses $("#esotbToggledSkillInfo").find(...).is(":checked") to read
  //    toggle skill checkboxes. In Node.js the jQuery mock has no real DOM, so
  //    checkElement.length = 1 (mock) and .is(":checked") returns a chain proxy.
  //    This makes SetEsoBuildToggledSkillEnable(skillId, falsyValue) overwrite the
  //    enabled=true that calculator.ts set before the calculation.
  //
  //    Fix: save enabled[] before the original call and restore afterwards — preserves
  //    the programmatic state without affecting the engine's validation (.valid) logic.
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

  // 8. (no patch on RemoveEsoDescriptionFormats)
  //
  //    ComputeEsoInputSkillValue already does replaceAll("\n", " ") internally,
  //    converting \n\n → "  " (two spaces) before the regex matches.
  //    Rules using [\r\n ]{2,} depend on those two spaces to tell list-item
  //    ends apart (e.g. "5%  Reduces" in Medium Armor Bonuses).
  //    A patch here converting \n → " " (single space) collapses \n\n → "  " → " "
  //    inside ComputeEsoInputSkillValue, breaking those rules.
  //    Rules with [\s\S]* (e.g. Emperor) already handle \n natively.

  // 9. Snapshot of racial and class passives BEFORE any calculation.
  //    The engine mutates g_SkillsData[id].raceType during calculations (e.g. when processing
  //    the character's race, it reassigns raceType on other races' skills).
  //    We snapshot here, with the clean init JSON data, so that
  //    listRacialPassives/listClassPassives/autoPassives are always correct.
  const passiveSnapshot: Record<string, any> = {};
  const rawSkillsData = (global as any).g_SkillsData ?? {};
  for (const [id, skill] of Object.entries(rawSkillsData) as [string, any][]) {
    if (!skill || skill.isPassive !== '1') continue;
    // Include racial, class and named skill lines (armor, weapons, guilds, etc.)
    // Exclude passives without a useful grouping (no raceType, classType or skillLine).
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

/** Allows reloading the engine (useful in tests) */
export function resetEngineLoader(): void {
  engineLoaded = false;
}
