import path from 'path';
import { initEsoEngine, setDomValue } from '../src/lib/eso-engine';
import { resetDomValues } from '../src/lib/eso-engine/env-setup';
initEsoEngine(
  path.resolve(__dirname, '../vendor/uesp-esochardata/resources'),
  path.resolve(__dirname, '../vendor/uesp-data/uesp-init-data.json'),
);

function run(targetRes: string, targetLv: string) {
  resetDomValues();
  const char: Record<string,string> = {
    esotbRace:'High Elf', esotbClass:'Sorcerer', esotbLevel:'50',
    esotbAttrHea:'0', esotbAttrMag:'64', esotbAttrSta:'0',
    esotbCPTotalPoints:'0', esotbMountSpeedBonus:'0', esotbBaseWalkSpeed:'3.0',
    esotbBuildDescription:'', esotbUsePtsRules:'false',
    esotbEnableRaceAutoPurchase:'false', esotbRulesVersion:'Live',
  };
  for (const [k, v] of Object.entries(char)) setDomValue(k, v);
  setDomValue('esotbTargetEffectiveLevel',    targetLv);
  setDomValue('esotbTargetResistance',        targetRes);
  setDomValue('esotbTargetCritResistFlat',    '0');
  setDomValue('esotbTargetPenetrationFlat',   '0');
  setDomValue('esotbTargetPenetrationFactor', '0');
  setDomValue('esotbTargetDefenseBonus',      '0');
  setDomValue('esotbTargetAttackBonus',       '0');
  setDomValue('esotbTargetCritDamage',        '0');
  setDomValue('esotbTargetCritChance',        '0');
  setDomValue('esotbTargetPercentHealth',     '100');
  const ALL_SLOTS = ['Head','Shoulders','Chest','Hands','Legs','Waist','Feet','Neck','Ring1','Ring2','MainHand1','OffHand1','MainHand2','OffHand2','Poison1','Poison2','Food','Potion'];
  const d = (global as any).g_EsoBuildItemData;
  for (const s of ALL_SLOTS) d[s] = {};
  (global as any).UpdateEsoComputedStatsList_Real(null, true);
  const cs = (global as any).g_EsoComputedStats ?? {};
  return {
    AttackSpellMitigation: cs['AttackSpellMitigation']?.value,
    AttackPhysicalMitigation: cs['AttackPhysicalMitigation']?.value,
    EffectiveSpellPower: cs['EffectiveSpellPower']?.value,
    EffectiveWeaponPower: cs['EffectiveWeaponPower']?.value,
    EffectivePower: cs['EffectivePower']?.value,
  };
}

console.log('targetRes=0, lv=66:', run('0','66'));
console.log('targetRes=18200 (UESP default), lv=66:', run('18200','66'));

// Verify formula manually: min(33000,18200) * -1/(66*1000) + 1 = 18200*(-1/66000)+1
const manual = 18200 * (-1/(66*1000)) + 1;
console.log('\nManual 1-factor:', manual.toFixed(4), '→ factor =', (1 - (1 - manual)).toFixed(4));
