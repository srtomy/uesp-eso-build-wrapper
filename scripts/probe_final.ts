import path from 'path';
import { initEsoEngine, setDomValue } from '../src/lib/eso-engine';
import { resetDomValues } from '../src/lib/eso-engine/env-setup';
initEsoEngine(
  path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
  path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
);

function run(char: Record<string, string>, targetLevel: string, items: Record<string, any> = {}) {
  resetDomValues();
  for (const [k, v] of Object.entries(char)) setDomValue(k, v);
  setDomValue('esotbTargetEffectiveLevel',   targetLevel);
  setDomValue('esotbTargetResistance',       '0');
  setDomValue('esotbTargetCritResistFlat',   '0');
  setDomValue('esotbTargetPenetrationFlat',  '0');
  setDomValue('esotbTargetPenetrationFactor','0');
  setDomValue('esotbTargetDefenseBonus',     '0');
  setDomValue('esotbTargetAttackBonus',      '0');
  setDomValue('esotbTargetCritDamage',       '0');
  setDomValue('esotbTargetCritChance',       '0');
  setDomValue('esotbTargetPercentHealth',    '100');
  const ALL_SLOTS = ['Head','Shoulders','Chest','Hands','Legs','Waist','Feet','Neck','Ring1','Ring2','MainHand1','OffHand1','MainHand2','OffHand2','Poison1','Poison2','Food','Potion'];
  const d = (global as any).g_EsoBuildItemData;
  const e = (global as any).g_EsoBuildEnchantData;
  for (const s of ALL_SLOTS) { d[s] = {}; if (e) e[s] = {}; }
  for (const [slot, item] of Object.entries(items) as any[]) {
    if (item?.itemId) {
      const def: Record<string, string> = {};
      for (let i = 1; i <= 12; i++) { def[`setBonusCount${i}`] = item[`setBonusCount${i}`] ?? '-1'; def[`setBonusDesc${i}`] = item[`setBonusDesc${i}`] ?? ''; }
      d[slot] = { ...def, ...item };
    }
  }
  (global as any).UpdateEsoComputedStatsList_Real(null, true);
  const cs = (global as any).g_EsoComputedStats ?? {};
  const raw: Record<string, number> = {};
  for (const id of Object.keys(cs)) { if (cs[id]?.value !== undefined) raw[id] = cs[id].value; }
  return raw;
}

const HE = {
  esotbRace:'High Elf',esotbClass:'Sorcerer',esotbLevel:'50',
  esotbAttrHea:'0',esotbAttrMag:'64',esotbAttrSta:'0',
  esotbCPTotalPoints:'0',esotbMountSpeedBonus:'0',esotbBaseWalkSpeed:'3.0',
  esotbBuildDescription:'',esotbUsePtsRules:'false',esotbEnableRaceAutoPurchase:'false',esotbRulesVersion:'Live',
};

const r66 = run(HE, '66');
console.log('=== High Elf Sorc, target lv66 (UESP default) ===');
console.log('AttackSpellMitigation:', r66['AttackSpellMitigation']);
console.log('AttackPhysicalMitigation:', r66['AttackPhysicalMitigation']);
console.log('EffectivePower:', r66['EffectivePower']);
console.log('EffectiveSpellPower:', r66['EffectiveSpellPower']);
console.log('EffectiveWeaponPower:', r66['EffectiveWeaponPower']);

const r50 = run(HE, '50');
console.log('\n=== High Elf Sorc, target lv50 ===');
console.log('AttackSpellMitigation:', r50['AttackSpellMitigation']);
console.log('EffectivePower:', r50['EffectivePower']);
console.log('EffectiveSpellPower:', r50['EffectiveSpellPower']);
console.log('EffectiveWeaponPower:', r50['EffectiveWeaponPower']);
