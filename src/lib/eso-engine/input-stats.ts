// Ported from PHP editBuild.class.php — STATS_UNIQUE_LIST, STATS_BASE_LIST, STATS_TYPE_LIST.
// Update when upstream changes these lists between ESO patches.
// Source: https://github.com/uesp/uesp-esochardata/blob/master/editBuild.class.php

const STATS_UNIQUE_LIST = [
  'Skill.EnableFrostTaunt', 'Set.CompanionSkillCooldown', 'Item.Divines', 'Item.Bloodthirsty',
  'Item.Sturdy', 'Item.Training', 'Item.MaelstromDamage', 'ArmorLight', 'ArmorMedium',
  'ArmorHeavy', 'ArmorTypes', 'WeaponDagger', 'WeaponSword', 'WeaponMace', 'WeaponAxe',
  'WeaponBow', 'Weapon1H', 'Weapon2H', 'WeaponPower', 'UsePtsRules', 'WeaponRestStaff',
  'WeaponDestStaff', 'WeaponFlameStaff', 'WeaponFrostStaff', 'WeaponShockStaff',
  'Weapon1HShield', 'WeaponOffHandDamage', 'WeaponOffHandDagger', 'WeaponOffHandSword',
  'WeaponOffHandMace', 'WeaponOffHandAxe', 'WeaponOffHandBow', 'WeaponOffHand1H',
  'WeaponOffHand2H', 'WeaponOffHandRestStaff', 'WeaponOffHandDestStaff',
  'WeaponOffHandFlameStaff', 'WeaponOffHandFrostStaff', 'WeaponOffHandShockStaff',
  'WeaponOffHand1HShield', 'Level', 'CPLevel', 'EffectiveLevel', 'CP.TotalPoints',
  'CP.UsedPoints', 'CP.HealingReduction', 'CP.Enabled', 'Attribute.TotalPoints',
  'Attribute.Health', 'Attribute.Magicka', 'Attribute.Stamina', 'Mundus.Name', 'Mundus.Name2',
  'Race', 'Class', 'Target.PercentHealth', 'Target.SpellResist', 'Target.PhysicalResist',
  'Target.PhysicalResistPctReduce', 'Target.PenetrationFactor', 'Target.PenetrationFlat',
  'Target.DefenseBonus', 'Target.AttackBonus', 'Target.CritDamage', 'Target.CritChance',
  'Target.CritResistFactor', 'Target.HealingReceived', 'Target.HealingTaken',
  'Target.HealingReduction', 'Target.DamageTaken', 'Target.DamageDone', 'Target.SpellDebuff',
  'Target.PhysicalDebuff', 'Target.EffectiveLevel', 'Misc.SpellCost', 'VampireStage',
  'WerewolfStage', 'SkillCost.Runemend_Cost', 'SkillCost.Simmering_Frenzy_Cost',
  'SkillCost.Crystal_Fragments_Cost', 'SkillDamage.Crystal Fragments',
  'SkillCost.Regular_Ability_Cost', 'SkillCost.Ardent_Flame_Cost',
  'SkillCost.Draconic_Power_Cost', 'SkillCost.Earthern_Heart_Cost',
  'SkillCost.Assassination_Cost', 'SkillCost.Blood_Scion_Cost',
  'SkillCost.Bone_Goliath_Transformation_Cost', 'SkillCost.Shadow_Cost',
  'SkillCost.Siphoning_Cost', 'SkillCost.Daedric_Summoning_Cost', 'SkillCost.Dark_Magic_Cost',
  'SkillCost.Storm_Calling_Cost', 'SkillCost.Aedric_Spear_Cost', 'SkillCost.Dawns_Wrath_Cost',
  'SkillCost.Restoring_Light_Cost', 'SkillCost.Two_Handed_Cost',
  'SkillCost.One_Hand_and_Shield_Cost', 'SkillCost.Dual_Wield_Cost', 'SkillCost.Bow_Cost',
  'SkillCost.Destruction_Staff_Cost', 'SkillCost.Restoration_Staff_Cost',
  'SkillCost.Vampire_Cost', 'SkillCost.Werewolf_Cost',
  'SkillCost.Werewolf_Transformation_Cost', 'SkillCost.Fighters_Guild_Cost',
  'SkillCost.Mages_Guild_Cost', 'SkillCost.Undaunted_Cost', 'SkillCost.Assault_Cost',
  'SkillCost.Support_Cost', 'SkillCost.Psijic_Order_Cost', 'SkillCost.Blastbones_Cost',
  'SkillCost.Blighted_Blastbones_Cost', 'SkillCost.Stalking_Blastbones_Cost',
  'SkillCost.Skeletal_Mage_Cost', 'SkillCost.Spirit_Mender_Cost', 'Stealthed',
  'Skill.HAMagRestoreRestStaff', 'Skill.HAStaRestoreWerewolf', 'SkillDuration.Placeholder',
  'SkillDamage.Placeholder', 'SkillDamage.Runeblades', 'SkillFlatDamage.Placeholder',
  'SkillWeaponDamage.Placeholder', 'SkillSpellDamage.Placeholder',
  'SkillLineDamage.Placeholder', 'SkillLineDamage.Bow', 'SkillLineDamage.Dual_Wield',
  'SkillLineDamage.Two_Handed', 'SkillHealing.Placeholder', 'SkillLineWeaponDmg.base',
  'SkillLineSpellDmg.base', 'SkillBonusWeaponDmg.base', 'SkillBonusSpellDmg.base',
  'SkillDirectDamage.Placeholder', 'SkillDotDamage.Placeholder',
  'Item.ChannelSpellDamage', 'Item.ChannelWeaponDamage', 'Buff.Empower',
  'CP.HAActiveDamage', 'CP.LAActiveDamage', 'Cyrodiil', 'DrinkBuff', 'FoodBuff',
  'Skill.VampireStage', 'MountSpeedBonus', 'BaseWalkSpeed', 'Skill.NormalSneakSpeed',
  'CP.TargetRecovery', 'CP.InspirationGained', 'Skill.DestructionPenetration',
  'Skill2.DestructionPenetration', 'EnchantPotencyMainHand1', 'EnchantCooldownMainHand1',
  'EnchantPotencyMainHand2', 'EnchantCooldownMainHand2', 'EnchantPotencyOffHand1',
  'EnchantCooldownOffHand1', 'EnchantPotencyOffHand2', 'EnchantCooldownOffHand2',
  'Item.EnchantCooldown', 'Item.SynergyBonus', 'BuildDescription',
  'Skill.PoisonStaminaCost', 'Skill.FlameAOEDamageDone', 'Skill.RestorationExperience',
  'Skill.TwoHandedExperience', 'Skill.BowExperience', 'Skill.DestructionExperience',
  'Skill.OneHandandShieldExperience', 'Skill.LightArmorExperience',
  'Skill.MediumArmorExperience', 'Skill.HeavyArmorExperience', 'Skill.DualWieldExperience',
  'Skill.AlliancePointsGained', 'Skill.ExperienceGained', 'Skill.InspirationGained',
  'Skill.PickPocketChance', 'Skill.LavaDamage', 'Set.PlayerDamageTaken',
  'Set.PlayerAOEDamageTaken', 'Set.SiegeDamageTaken', 'Skill.SiegeDamage',
  'Skill.UltimateRegen', 'Set.TrapDamageTaken', 'Buff.DungeonDamageTaken',
  'Skill.RangedDamageTaken', 'Skill.BlockRangedDamageTaken', 'Buff.Vulnerability',
  'Buff.FlameVulnerability', 'Buff.PoisonVulnerability', 'Target.Vulnerability',
  'Target.FlameVulnerability', 'Target.PoisonVulnerability', 'Set.ElfBaneDuration',
  'Skill.DiseaseImmunity', 'Skill.BurningImmunity', 'Skill.ChilledImmunity',
  'Skill.PoisonImmunity', 'Skill.BurningDamage', 'Skill.PoisonedDamage',
  'Skill.StatusEffectChance', 'Skill.BurningChance', 'Skill.ChilledChance',
  'Skill.ConcussionChance', 'Item.StatusEffectChance', 'Set.StatusEffectChance',
  'CP.WeaponCritHealing', 'CP.SpellCritHealing', 'Set.TwinSlashInitialDamage',
  'Set.GuardDamage', 'Set.PoisonDuration', 'Set.MagickaAbilityDamageDone',
  'Set.HealingAbilityCost', 'Set.PhysicalDotDamageDone', 'Set.PoisonDotDamageDone',
  'Set.DiseaseDotDamageDone', 'Set.BleedDotDamageDone', 'Set.PhysicalChannelDamageDone',
  'Set.PoisonChannelDamageDone', 'Set.DiseaseChannelDamageDone', 'Set.BleedChannelDamageDone',
  'Set.HealthRegenResistFactor', 'Set.RangedDamageTaken', 'Skill.HealCrit',
  'Skill2.LASpellDamage', 'Skill2.HASpellDamage', 'SkillBonusSpellDmg.Flame',
  'SkillBonusSpellDmg.Shock', 'SkillBonusSpellDmg.Frost', 'SkillBonusSpellDmg.Magic',
  'SkillBonusSpellDmg.Bleed', 'SkillBonusSpellDmg.Physical', 'SkillBonusSpellDmg.Poison',
  'SkillBonusSpellDmg.Disease', 'SkillBonusWeaponDmg.Physical', 'SkillBonusWeaponDmg.Poison',
  'SkillBonusWeaponDmg.Disease', 'SkillBonusWeaponDmg.Bleed', 'SkillBonusWeaponDmg.Flame',
  'SkillBonusWeaponDmg.Magic', 'SkillBonusWeaponDmg.Shock', 'SkillBonusWeaponDmg.Frost',
  'Set.ExtraBashDamage', 'Item.ExtraBashDamage', 'Skill.ExtraBashDamage', 'Set.VampireLord',
  'Set.BuffDuration', 'Skill.BlockSpeedPenalty', 'Skill.HeavyAttackSpeed',
  'Set.FlameCritDamageTaken', 'Set.ShockCritDamageTaken', 'Set.FrostCritDamageTaken',
  'Set.NonWeaponAbilityCost', 'Set.AOESpellDamage', 'Set.AOEWeaponDamage',
  'CP.HealingSpellDamage', 'CP.HealingWeaponDamage', 'Set.DOTSpellDamage',
  'Set.DOTWeaponDamage', 'Set.RangedSpellDamage', 'Set.RangedWeaponDamage',
  'Set.MeleeSpellDamage', 'Set.MeleeWeaponDamage', 'Set.WeaponTraitEffect',
  'Set.DirectSpellDamage', 'Set.DirectWeaponDamage', 'Set.DirectRangeSpellDamage',
  'Set.DirectRangeWeaponDamage', 'ThreeSetCount', 'Set.EnemyTargetSpellDamage',
  'Set.EnemyTargetWeaponDamage', 'Set.CorelRiptide', 'Set.MorasWhispers',
  'Set.PearlescentWard', 'Set.DisableSetBonus', 'Buff.MinorCount', 'Buff.MajorCount',
];

const STATS_TYPE_LIST = [
  'Item', 'Set', 'Skill', 'Skill2', 'Buff', 'Food', 'CP', 'Mundus', 'Target', 'Vampire',
];

const STATS_BASE_LIST = [
  'Health', 'Magicka', 'Stamina', 'HealthRegen', 'MagickaRegen', 'StaminaRegen',
  'HealthRestore', 'MagickaRestore', 'StaminaRestore', 'UltimateRestore',
  'WeaponDamage', 'SpellDamage', 'WeaponCrit', 'SpellCrit', 'CritDamage', 'CritDamageTaken',
  'SpellCritDamage', 'WeaponCritDamage', 'SpellResist', 'PhysicalResist', 'FlameResist',
  'FrostResist', 'ShockResist', 'PoisonResist', 'DiseaseResist', 'CritResist',
  'SpellPenetration', 'PhysicalPenetration', 'HealingDone', 'HealingTaken', 'HealingReceived',
  'HealingTotal', 'HealingReduction', 'BashCost', 'BashWeaponDamage', 'BashSpellDamage',
  'BashDamage', 'BlockCost', 'BlockMitigation', 'BlockMeleeMitigation', 'RollDodgeCost',
  'FlatRollDodgeCost', 'RollDodgeDuration', 'SprintCost', 'SprintSpeed', 'MovementSpeed',
  'MountSpeed', 'SwimSpeed', 'BlockSpeed', 'SneakSpeed', 'SneakCost', 'BreakFreeCost',
  'BreakFreeDuration', 'CrowdControlDuration', 'Constitution', 'DamageShield',
  'DotDamageDone', 'ChannelDamageDone', 'DirectDamageDone', 'MagicDamageDone',
  'PhysicalDamageDone', 'ShockDamageDone', 'FlameDamageDone', 'FrostDamageDone',
  'PoisonDamageDone', 'DiseaseDamageDone', 'PetDamageDone', 'HADamageTaken', 'LADamageTaken',
  'DotDamageTaken', 'AOEDamageTaken', 'PlayerDamageTaken', 'PlayerAOEDamageTaken',
  'RangedDamageTaken', 'MagicDamageTaken', 'PhysicalDamageTaken', 'ShockDamageTaken',
  'FlameDamageTaken', 'FrostDamageTaken', 'PoisonDamageTaken', 'BleedDamageTaken',
  'DiseaseDamageTaken', 'DirectDamageTaken', 'HADamage', 'LADamage', 'HAMeleeDamage',
  'LAMeleeDamage', 'HAWeaponDamage', 'HABowDamage', 'HAStaffDamage', 'LAWeaponDamage',
  'LABowDamage', 'LAStaffDamage', 'LASpeed', 'LAMeleeSpeed', 'ShieldDamageDone',
  'FearDuration', 'SnareDuration', 'SnareEffect', 'HealthCost', 'MagickaCost',
  'StaminaCost', 'UltimateCost', 'PotionDuration', 'PotionCooldown', 'AttackSpeed',
  'TrapResist', 'NegativeEffectDuration', 'DisableEffectDuration', 'BowRange',
  'FlameEffectDuration', 'BowDamageDone', 'ResurrectSpeed', 'BossDamageResist',
  'SneakRange', 'SneakDetectRange', 'TwiceBornStar', 'HAChargeTime', 'DodgeChance',
  'DamageTaken', 'DamageDone', 'StunDuration', 'DisorientDuration',
  'WerewolfTransformCost', 'EnchantCooldown', 'EnchantPotency',
  // Adicionado após sincronização com o JSON extraído do browser (patch 49→50)
  'AOEDamageDone', 'AOEHealingDone', 'BleedDamageDone', 'BossDamageDone', 'BossDamageTaken',
  'ClassSpellDamage', 'ClassWeaponDamage', 'CritHealing', 'DamageShieldCost', 'DotHealingDone',
  'DoubleHarvestChance', 'DrinkDuration', 'FallDamageTaken', 'FenceSellCost', 'FlatDamageDone',
  'FoodDuration', 'GoldGained', 'HAMagRestore', 'HAStaRestore', 'HarvestSpeed',
  'InspirationGained', 'MagicalStatusEffectChance', 'MartialStatusEffectChance',
  'MerchantSellCost', 'OverloadDamage', 'RepairArmorCost', 'Set.BahseiMania',
  'SingleTargetDamageDone', 'SingleTargetDamageTaken', 'SingleTargetHealingDone',
  'StatusDamageDone', 'StatusEffectDamage', 'StatusEffectDuration', 'StatusEffectDurationTaken',
  'WayshrineCost',
];

export function buildInputStats(): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const item of STATS_UNIQUE_LIST) {
    const parts = item.split('.');
    if (parts.length === 1) {
      if (result[parts[0]] === undefined) result[parts[0]] = 0;
    } else {
      const base = parts[0];
      if (typeof result[base] !== 'object' || result[base] === null) result[base] = {};
      (result[base] as Record<string, number>)[parts[1]] = 0;
    }
  }

  for (const stat of STATS_BASE_LIST) {
    if (result[stat] === undefined) result[stat] = 0;
  }

  for (const type of STATS_TYPE_LIST) {
    if (typeof result[type] !== 'object' || result[type] === null) result[type] = {};
    for (const stat of STATS_BASE_LIST) {
      (result[type] as Record<string, number>)[stat] = 0;
    }
  }

  return result;
}
