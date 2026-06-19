import path from 'path';
import fs from 'fs';
import type { UespInitData } from '../../src/lib/eso-engine';

const JSON_PATH = path.resolve(__dirname, '../../vendor/uesp-data/uesp-game-data.json');

/**
 * Loads UespInitData from an open SQLite database connection.
 * Exported so test-db-init.ts can reuse this logic with its own DB path / version.
 */
export function loadInitDataFromDb(db: any, versionOverride?: string | null): UespInitData {
  const version: string =
    versionOverride ??
    (() => {
      const row = db
        .prepare("SELECT MAX(CAST(version AS INTEGER)) as v FROM rules WHERE version GLOB '[0-9]*'")
        .get() as any;
      return String(row.v);
    })();

  const csRows = db.prepare('SELECT * FROM computedStats WHERE version = ?').all(version) as any[];
  const rulesRows = db.prepare('SELECT * FROM rules WHERE version = ?').all(version) as any[];
  const effectsRows = db
    .prepare('SELECT e.* FROM effects e JOIN rules r ON r.id = e.ruleId WHERE r.version = ?')
    .all(version) as any[];
  const cpSkillsRows = db.prepare('SELECT * FROM cp2Skills').all() as any[];
  const cpDescRows = db.prepare('SELECT * FROM cp2SkillDescriptions').all() as any[];
  const psRows = db.prepare('SELECT * FROM playerSkills').all() as any[];
  const stRows = db.prepare('SELECT * FROM skillTree').all() as any[];

  const computedStats: Record<string, unknown> = {};
  for (const row of csRows) {
    let compute: unknown = row.compute;
    try { compute = JSON.parse(row.compute); } catch { /* keep string */ }
    let depends: unknown = null;
    try { depends = row.dependsOn ? JSON.parse(row.dependsOn as string) : null; } catch { /* keep null */ }
    computedStats[row.statId] = {
      id: String(row.id), statId: row.statId, version: row.version, title: row.title,
      addClass: row.addClass, comment: row.comment, minimumValue: row.minimumValue,
      maximumValue: row.maximumValue, deferLevel: row.deferLevel, display: row.display,
      compute, idx: String(row.idx), category: row.category, suffix: row.suffix,
      dependsOn: row.dependsOn, depends, round: row.roundNum, value: 0, preCapValue: 0,
    };
  }

  const effectsByRuleId = new Map<number, any[]>();
  for (const eff of effectsRows) {
    const list = effectsByRuleId.get(eff.ruleId) ?? [];
    list.push(eff);
    effectsByRuleId.set(eff.ruleId, list);
  }

  const buildRules: Record<string, Record<string, unknown>> = {};
  for (const rule of rulesRows) {
    const type = rule.ruleType;
    if (!buildRules[type]) buildRules[type] = {};
    const ruleEffects = (effectsByRuleId.get(rule.id) ?? []).map((eff) => ({
      id: String(eff.id), ruleId: String(eff.ruleId), version: eff.version,
      statId: eff.statId, value: eff.value, display: eff.display, category: eff.category,
      combineAs: eff.combineAs, factorValue: eff.factorValue, statDesc: eff.statDesc,
      buffId: eff.buffId, regexVar: eff.regexVar, effectId: eff.id, round: eff.roundNum ?? '',
    }));
    let customDataParsed: Record<string, unknown> = {};
    if (rule.customData) {
      try { customDataParsed = JSON.parse(rule.customData as string); } catch { /* keep empty */ }
    }
    buildRules[type][String(rule.id)] = {
      id: rule.id, version: rule.version, ruleType: rule.ruleType, nameId: rule.nameId,
      displayName: rule.displayName, matchRegex: rule.matchRegex, displayRegex: rule.displayRegex,
      statRequireId: rule.statRequireId, statRequireValue: rule.statRequireValue,
      factorStatId: rule.factorStatId, isEnabled: Boolean(rule.isEnabled),
      isVisible: Boolean(rule.isVisible), isToggle: Boolean(rule.isToggle),
      enableOffBar: Boolean(rule.enableOffBar), originalId: rule.originalId, icon: rule.icon,
      groupName: rule.groupName, maxTimes: rule.maxTimes, comment: rule.comment,
      description: rule.description, customData: rule.customData, ruleId: rule.id,
      effects: ruleEffects,
      ...customDataParsed,
    };
  }

  const cpSkillsData: Record<string, unknown> = {};
  for (const row of cpSkillsRows) {
    cpSkillsData[String(row.abilityId)] = {
      id: String(row.id), skillId: String(row.skillId), parentSkillId: String(row.parentSkillId),
      abilityId: String(row.abilityId), disciplineIndex: String(row.disciplineIndex),
      disciplineId: String(row.disciplineId), skillIndex: String(row.skillIndex), name: row.name,
      skillType: String(row.skillType), minDescription: row.minDescription,
      maxDescription: row.maxDescription, maxValue: String(row.maxValue),
      isRoot: String(row.isRoot), isClusterRoot: String(row.isClusterRoot),
      maxPoints: String(row.maxPoints), jumpPoints: row.jumpPoints,
      jumpPointDelta: String(row.jumpPointDelta), numJumpPoints: String(row.numJumpPoints),
      x: String(row.x), y: String(row.y), a: String(row.a), b: String(row.b),
      c: String(row.c), d: String(row.d), r2: String(row.r2), fitDescription: row.fitDescription,
    };
  }

  const cpSkillDescData: Record<string, string[]> = {};
  for (const row of cpDescRows) {
    const key = String(row.abilityId);
    if (!cpSkillDescData[key]) cpSkillDescData[key] = [];
    cpSkillDescData[key][row.points] = row.description;
  }

  const skillTreeByAbilityId = new Map<number, any>();
  for (const st of stRows) {
    if (st.abilityId != null) skillTreeByAbilityId.set(st.abilityId, st);
  }

  const skillsData: Record<string, unknown> = {};
  const setSkillsData: Record<string, unknown> = {};
  for (const ps of psRows) {
    const st = skillTreeByAbilityId.get(ps.id);
    const entry: Record<string, unknown> = {
      displayId: String(ps.displayId ?? ps.id), name: ps.name, indexName: ps.indexName,
      description: ps.description, descHeader: ps.descHeader, target: ps.target,
      skillType: ps.skillType, upgradeLines: ps.upgradeLines, effectLines: ps.effectLines,
      duration: ps.duration, startTime: ps.startTime, tickTime: ps.tickTime,
      cooldown: ps.cooldown, cost: ps.cost, costTime: ps.costTime, baseCost: ps.baseCost,
      baseMechanic: ps.baseMechanic, baseIsCostTime: ps.baseIsCostTime,
      chargeFreq: ps.chargeFreq, minRange: ps.minRange, maxRange: ps.maxRange,
      radius: ps.radius, isPassive: ps.isPassive, isChanneled: ps.isChanneled,
      isPermanent: ps.isPermanent, isCrafted: ps.isCrafted, craftedId: ps.craftedId,
      castTime: ps.castTime, channelTime: ps.channelTime, angleDistance: ps.angleDistance,
      mechanic: ps.mechanic, mechanicTime: ps.mechanicTime, texture: ps.texture,
      isPlayer: ps.isPlayer, raceType: ps.raceType, classType: ps.classType,
      setName: ps.setName, skillLine: ps.skillLine, prevSkill: ps.prevSkill,
      nextSkill: ps.nextSkill, nextSkill2: ps.nextSkill2, baseAbilityId: ps.baseAbilityId,
      learnedLevel: ps.learnedLevel, rank: ps.rank, morph: ps.morph,
      skillIndex: ps.skillIndex, buffType: ps.buffType, isToggle: ps.isToggle,
      numCoefVars: ps.numCoefVars, coefDescription: ps.coefDescription,
      type1: ps.type1, a1: ps.a1, b1: ps.b1, c1: ps.c1, R1: ps.R1, avg1: ps.avg1,
      type2: ps.type2, a2: ps.a2, b2: ps.b2, c2: ps.c2, R2: ps.R2, avg2: ps.avg2,
      type3: ps.type3, a3: ps.a3, b3: ps.b3, c3: ps.c3, R3: ps.R3, avg3: ps.avg3,
      type4: ps.type4, a4: ps.a4, b4: ps.b4, c4: ps.c4, R4: ps.R4, avg4: ps.avg4,
      type5: ps.type5, a5: ps.a5, b5: ps.b5, c5: ps.c5, R5: ps.R5, avg5: ps.avg5,
      type6: ps.type6, a6: ps.a6, b6: ps.b6, c6: ps.c6, R6: ps.R6, avg6: ps.avg6,
      rawDescription: ps.rawDescription, rawName: ps.rawName, rawTooltip: ps.rawTooltip,
      rawCoef: ps.rawCoef, coefTypes: ps.coefTypes, isMastery: ps.isMastery,
      id: String(ps.id), skillTypeName: st?.skillTypeName ?? '',
      baseName: st?.baseName ?? ps.name, maxRank: st?.maxRank ?? '',
      icon: st?.icon ?? ps.texture ?? '',
    };
    skillsData[String(ps.id)] = entry;
    if (ps.setName) setSkillsData[ps.setName] = entry;
  }

  return {
    computedStats,
    buffData: {} as Record<string, unknown>,
    cpData: {},
    buildRules: buildRules as Record<string, unknown>,
    skillsData,
    setSkillsData,
    cpSkillsData,
    cpSkillDescData: cpSkillDescData as unknown as Record<string, Record<string, string>>,
  };
}

/**
 * Loads UespInitData for tests from the committed game data JSON.
 * To update the JSON, run: npm run generate-data -- --db /path/to/local.db
 */
export function loadInitData(): UespInitData {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')) as UespInitData;
}
