/**
 * Testa se a inicialização a partir do banco SQLite (eso-build-editor/local.db)
 * produz os mesmos stats que a inicialização via uesp-init-data.json.
 *
 * USO:
 *   npx ts-node scripts/test-db-init.ts <caminho-do-build.json> [caminho-do-db]
 *
 * Padrões:
 *   build: ~/Downloads/uesp-build-export.json
 *   db:    ../eso-build-editor/local.db
 *
 * O script roda o mesmo build DUAS vezes — uma com cada fonte de dados — e
 * compara os resultados entre si e contra `expectedStats` (se presente).
 */

// @ts-expect-error node:sqlite é experimental mas disponível no Node v22+
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { initEsoEngine, resetEngine, calculateBuild } from '../src/lib/eso-engine';
import { buildInputStats } from '../src/lib/eso-engine/input-stats';
import type { BuildInput, ComputedStats, UespInitData } from '../src/lib/eso-engine';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const buildJsonPath = process.argv[2]
  ?? path.resolve(process.env.HOME!, 'Downloads/uesp-build-export.json');
const dbPath = process.argv[3]
  ?? path.resolve(__dirname, '../../eso-build-editor/local.db');
// Versão das regras a usar. Altere aqui para fixar manualmente (ex: '49', '50').
// null = maior versão numérica disponível no banco.
const RULES_VERSION: string | null = null;
const versionOverride = process.argv[4] ?? RULES_VERSION;

if (!fs.existsSync(buildJsonPath)) {
  console.error(`Build JSON não encontrado: ${buildJsonPath}`);
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error(`Banco de dados não encontrado: ${dbPath}`);
  process.exit(1);
}

const build: BuildInput & { expectedStats?: Record<string, number> } =
  JSON.parse(fs.readFileSync(buildJsonPath, 'utf-8'));

const RESOURCES = path.resolve(__dirname, '../vendor/uesp-esochardata/resources');
const INIT_JSON = path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json');

const LINE = '─'.repeat(72);

// ---------------------------------------------------------------------------
// Helper — load UespInitData from SQLite (mirrors engine-loader.ts)
// ---------------------------------------------------------------------------
function loadInitDataFromDb(db: InstanceType<typeof DatabaseSync>): UespInitData {
  // Determina a versão a usar: override explícito ou maior versão numérica do banco.
  const version: string = versionOverride ?? (() => {
    const row = db.prepare(
      "SELECT MAX(CAST(version AS INTEGER)) as v FROM rules WHERE version GLOB '[0-9]*'"
    ).get() as any;
    return String(row.v);
  })();
  console.log(`  Versão de regras selecionada: ${version}`);

  const csRows        = db.prepare('SELECT * FROM computedStats WHERE version = ?').all(version) as any[];
  const rulesRows     = db.prepare('SELECT * FROM rules WHERE version = ?').all(version) as any[];
  const effectsRows   = db.prepare(
    'SELECT e.* FROM effects e JOIN rules r ON r.id = e.ruleId WHERE r.version = ?'
  ).all(version) as any[];
  const cpSkillsRows  = db.prepare('SELECT * FROM cp2Skills').all() as any[];
  const cpDescRows    = db.prepare('SELECT * FROM cp2SkillDescriptions').all() as any[];
  const psRows        = db.prepare('SELECT * FROM playerSkills').all() as any[];
  const stRows        = db.prepare('SELECT * FROM skillTree').all() as any[];

  // 1. computedStats
  const computedStats: Record<string, unknown> = {};
  for (const row of csRows) {
    let compute: unknown = row.compute;
    try { compute = JSON.parse(row.compute); } catch { /* keep string */ }
    let depends: unknown = null;
    try { depends = row.dependsOn ? JSON.parse(row.dependsOn as string) : null; } catch { /* keep null */ }
    computedStats[row.statId] = {
      id: String(row.id),
      statId: row.statId,
      version: row.version,
      title: row.title,
      addClass: row.addClass,
      comment: row.comment,
      minimumValue: row.minimumValue,
      maximumValue: row.maximumValue,
      deferLevel: row.deferLevel,
      display: row.display,
      compute,
      idx: String(row.idx),
      category: row.category,
      suffix: row.suffix,
      dependsOn: row.dependsOn,
      depends,
      round: row.roundNum,
      value: 0,
      preCapValue: 0,
    };
  }

  // 2. buildRules (rules + effects JOIN)
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
      id: String(eff.id),
      ruleId: String(eff.ruleId),
      version: eff.version,
      statId: eff.statId,
      value: eff.value,
      display: eff.display,
      category: eff.category,
      combineAs: eff.combineAs,
      factorValue: eff.factorValue,
      statDesc: eff.statDesc,
      buffId: eff.buffId,
      regexVar: eff.regexVar,
      effectId: eff.id,
      round: eff.roundNum ?? '',
    }));
    buildRules[type][String(rule.id)] = {
      id: rule.id,
      version: rule.version,
      ruleType: rule.ruleType,
      nameId: rule.nameId,
      displayName: rule.displayName,
      matchRegex: rule.matchRegex,
      displayRegex: rule.displayRegex,
      statRequireId: rule.statRequireId,
      statRequireValue: rule.statRequireValue,
      factorStatId: rule.factorStatId,
      isEnabled: Boolean(rule.isEnabled),
      isVisible: Boolean(rule.isVisible),
      isToggle: Boolean(rule.isToggle),
      enableOffBar: Boolean(rule.enableOffBar),
      originalId: rule.originalId,
      icon: rule.icon,
      groupName: rule.groupName,
      maxTimes: rule.maxTimes,
      comment: rule.comment,
      description: rule.description,
      customData: rule.customData,
      ruleId: rule.id,
      effects: ruleEffects,
    };
  }

  // 3. cpSkillsData
  const cpSkillsData: Record<string, unknown> = {};
  for (const row of cpSkillsRows) {
    cpSkillsData[String(row.abilityId)] = {
      id: String(row.id),
      skillId: String(row.skillId),
      parentSkillId: String(row.parentSkillId),
      abilityId: String(row.abilityId),
      disciplineIndex: String(row.disciplineIndex),
      disciplineId: String(row.disciplineId),
      skillIndex: String(row.skillIndex),
      name: row.name,
      skillType: String(row.skillType),
      minDescription: row.minDescription,
      maxDescription: row.maxDescription,
      maxValue: String(row.maxValue),
      isRoot: String(row.isRoot),
      isClusterRoot: String(row.isClusterRoot),
      maxPoints: String(row.maxPoints),
      jumpPoints: row.jumpPoints,
      jumpPointDelta: String(row.jumpPointDelta),
      numJumpPoints: String(row.numJumpPoints),
      x: String(row.x),
      y: String(row.y),
      a: String(row.a),
      b: String(row.b),
      c: String(row.c),
      d: String(row.d),
      r2: String(row.r2),
      fitDescription: row.fitDescription,
    };
  }

  // 4. cpSkillDescData
  const cpSkillDescData: Record<string, string[]> = {};
  for (const row of cpDescRows) {
    const key = String(row.abilityId);
    if (!cpSkillDescData[key]) cpSkillDescData[key] = [];
    cpSkillDescData[key][row.points] = row.description;
  }

  // 5. skillsData (playerSkills LEFT JOIN skillTree on abilityId)
  const skillTreeByAbilityId = new Map<number, any>();
  for (const st of stRows) {
    if (st.abilityId != null) skillTreeByAbilityId.set(st.abilityId, st);
  }

  const skillsData: Record<string, unknown> = {};
  const setSkillsData: Record<string, unknown> = {};

  for (const ps of psRows) {
    const st = skillTreeByAbilityId.get(ps.id);
    const entry: Record<string, unknown> = {
      displayId: String(ps.displayId ?? ps.id),
      name: ps.name,
      indexName: ps.indexName,
      description: ps.description,
      descHeader: ps.descHeader,
      target: ps.target,
      skillType: ps.skillType,
      upgradeLines: ps.upgradeLines,
      effectLines: ps.effectLines,
      duration: ps.duration,
      startTime: ps.startTime,
      tickTime: ps.tickTime,
      cooldown: ps.cooldown,
      cost: ps.cost,
      costTime: ps.costTime,
      baseCost: ps.baseCost,
      baseMechanic: ps.baseMechanic,
      baseIsCostTime: ps.baseIsCostTime,
      chargeFreq: ps.chargeFreq,
      minRange: ps.minRange,
      maxRange: ps.maxRange,
      radius: ps.radius,
      isPassive: ps.isPassive,
      isChanneled: ps.isChanneled,
      isPermanent: ps.isPermanent,
      isCrafted: ps.isCrafted,
      craftedId: ps.craftedId,
      castTime: ps.castTime,
      channelTime: ps.channelTime,
      angleDistance: ps.angleDistance,
      mechanic: ps.mechanic,
      mechanicTime: ps.mechanicTime,
      texture: ps.texture,
      isPlayer: ps.isPlayer,
      raceType: ps.raceType,
      classType: ps.classType,
      setName: ps.setName,
      skillLine: ps.skillLine,
      prevSkill: ps.prevSkill,
      nextSkill: ps.nextSkill,
      nextSkill2: ps.nextSkill2,
      baseAbilityId: ps.baseAbilityId,
      learnedLevel: ps.learnedLevel,
      rank: ps.rank,
      morph: ps.morph,
      skillIndex: ps.skillIndex,
      buffType: ps.buffType,
      isToggle: ps.isToggle,
      numCoefVars: ps.numCoefVars,
      coefDescription: ps.coefDescription,
      type1: ps.type1, a1: ps.a1, b1: ps.b1, c1: ps.c1, R1: ps.R1, avg1: ps.avg1,
      type2: ps.type2, a2: ps.a2, b2: ps.b2, c2: ps.c2, R2: ps.R2, avg2: ps.avg2,
      type3: ps.type3, a3: ps.a3, b3: ps.b3, c3: ps.c3, R3: ps.R3, avg3: ps.avg3,
      type4: ps.type4, a4: ps.a4, b4: ps.b4, c4: ps.c4, R4: ps.R4, avg4: ps.avg4,
      type5: ps.type5, a5: ps.a5, b5: ps.b5, c5: ps.c5, R5: ps.R5, avg5: ps.avg5,
      type6: ps.type6, a6: ps.a6, b6: ps.b6, c6: ps.c6, R6: ps.R6, avg6: ps.avg6,
      rawDescription: ps.rawDescription,
      rawName: ps.rawName,
      rawTooltip: ps.rawTooltip,
      rawCoef: ps.rawCoef,
      coefTypes: ps.coefTypes,
      isMastery: ps.isMastery,
      id: st ? String(st.id) : String(ps.id),
      skillTypeName: st?.skillTypeName ?? '',
      baseName: st?.baseName ?? ps.name,
      maxRank: st?.maxRank ?? '',
      icon: st?.icon ?? ps.texture ?? '',
    };
    skillsData[String(ps.id)] = entry;
    if (ps.setName) setSkillsData[ps.setName] = entry;
  }

  return {
    computedStats,
    inputStats: buildInputStats(),
    buffData: {} as Record<string, unknown>,
    cpData: {},
    buildRules: buildRules as Record<string, unknown>,
    skillsData,
    setSkillsData,
    cpSkillsData,
    cpSkillDescData: cpSkillDescData as unknown as Record<string, Record<string, string>>,
  };
}

// ---------------------------------------------------------------------------
// Run build + collect raw stats
// ---------------------------------------------------------------------------
function runBuild(label: string, initFn: () => void): Record<string, number> {
  resetEngine();
  initFn();
  const result: ComputedStats = calculateBuild(build as BuildInput);
  console.log(`\n[${label}]  Health=${result.Health}  Magicka=${result.Magicka}  SpellDamage=${result.SpellDamage}`);
  return result.raw as Record<string, number>;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`\n${LINE}`);
console.log(`  BUILD: ${path.basename(buildJsonPath)}`);
console.log(`  DB:    ${dbPath}`);
console.log(LINE);

// Run #1 — JSON (baseline)
console.log('\nRodando com uesp-init-data.json...');
const t0 = Date.now();
const rawJson = runBuild('JSON', () => initEsoEngine(RESOURCES, INIT_JSON));
console.log(`  tempo: ${Date.now() - t0}ms`);

// Run #2 — DB
console.log('\nRodando com local.db (SQLite)...');
const db = new DatabaseSync(dbPath);
const t1 = Date.now();
const dbInitData = loadInitDataFromDb(db);
const tLoad = Date.now();
console.log(`  carregamento do banco: ${tLoad - t1}ms`);
const rawDb = runBuild('DB ', () => initEsoEngine(RESOURCES, dbInitData));
console.log(`  tempo total (carga + cálculo): ${Date.now() - t1}ms`);
db.close();

// ---------------------------------------------------------------------------
// Comparison: JSON vs DB
// ---------------------------------------------------------------------------
const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

function compare(
  label: string,
  a: Record<string, number>,
  b: Record<string, number>,
  labelA: string,
  labelB: string,
) {
  const allIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  const rows: { id: string; va: number; vb: number; match: boolean }[] = [];
  for (const id of allIds) {
    const va = a[id] ?? 0;
    const vb = b[id] ?? 0;
    rows.push({ id, va, vb, match: Math.abs(va - vb) <= 1 });
  }
  const mismatches = rows.filter(r => !r.match);
  const matches    = rows.filter(r => r.match);

  console.log(`\n${LINE}`);
  console.log(`  ${BOLD}${label}${RESET}  (${matches.length} ok, ${mismatches.length} divergências)`);
  console.log(`  ${'STAT'.padEnd(42)} ${labelA.padStart(12)} ${labelB.padStart(12)}  OK?`);
  console.log('  ' + '·'.repeat(74));
  for (const r of [...mismatches, ...matches]) {
    const color = r.match ? GREEN : RED;
    const flag  = r.match ? 'ok   ' : 'DIFER';
    const diff  = r.match ? '' : ` (${r.vb > r.va ? '+' : ''}${(r.vb - r.va).toFixed(0)})`;
    console.log(
      `  ${color}${r.id.padEnd(42)} ${String(r.va).padStart(12)} ${String(r.vb).padStart(12)}${diff.padEnd(10)}  ${flag}${RESET}`,
    );
  }
  console.log(LINE);
  return mismatches.length;
}

const diffJsonDb = compare('JSON vs Banco', rawJson, rawDb, 'JSON', 'Banco');

// ---------------------------------------------------------------------------
// Comparação com expectedStats (quando presentes no build exportado)
// ---------------------------------------------------------------------------
const expected = build.expectedStats;
if (expected && Object.keys(expected).length > 0) {
  compare('UESP vs JSON',  expected, rawJson, 'UESP', 'JSON');
  compare('UESP vs Banco', expected, rawDb,   'UESP', 'Banco');
}

console.log(`\n  ${diffJsonDb === 0 ? GREEN + '✓ JSON e Banco produzem resultados idênticos' : RED + `✗ ${diffJsonDb} divergências entre JSON e Banco`}${RESET}\n`);
process.exit(diffJsonDb === 0 ? 0 : 1);
