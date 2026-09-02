[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / ComputedStats

# Interface: ComputedStats

The result of calculateBuild(): the key stats as named properties, plus
`raw` with all 221 computed stats from the UESP engine.

Stat IDs match `g_EsoComputedStats` exactly (UESP version 49+). Percent
values are returned as the engine stores them (e.g. 12.5 = 12.5%).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="attackphysicalmitigation"></a> `AttackPhysicalMitigation` | `number` | - |
| <a id="attackspellmitigation"></a> `AttackSpellMitigation` | `number` | - |
| <a id="critresist"></a> `CritResist` | `number` | - |
| <a id="defensephysicalmitigation"></a> `DefensePhysicalMitigation` | `number` | - |
| <a id="defensespellmitigation"></a> `DefenseSpellMitigation` | `number` | - |
| <a id="effectivepower"></a> `EffectivePower` | `number` | - |
| <a id="effectivespellpower"></a> `EffectiveSpellPower` | `number` | - |
| <a id="effectiveweaponpower"></a> `EffectiveWeaponPower` | `number` | - |
| <a id="healingdone"></a> `HealingDone` | `number` | - |
| <a id="healingtaken"></a> `HealingTaken` | `number` | - |
| <a id="health"></a> `Health` | `number` | - |
| <a id="healthregen"></a> `HealthRegen` | `number` | - |
| <a id="magicka"></a> `Magicka` | `number` | - |
| <a id="magickaregen"></a> `MagickaRegen` | `number` | - |
| <a id="physicalpenetration"></a> `PhysicalPenetration` | `number` | - |
| <a id="physicalresist"></a> `PhysicalResist` | `number` | - |
| <a id="raw"></a> `raw` | `Record`\<`string`, `number`\> | Objeto bruto com TODOS os valores de g_EsoComputedStats após o cálculo |
| <a id="runspeed"></a> `RunSpeed` | `number` | - |
| <a id="spellcrit"></a> `SpellCrit` | `number` | - |
| <a id="spellcritdamage"></a> `SpellCritDamage` | `number` | - |
| <a id="spelldamage"></a> `SpellDamage` | `number` | - |
| <a id="spellpenetration"></a> `SpellPenetration` | `number` | - |
| <a id="spellresist"></a> `SpellResist` | `number` | - |
| <a id="sprintspeed"></a> `SprintSpeed` | `number` | - |
| <a id="stamina"></a> `Stamina` | `number` | - |
| <a id="staminaregen"></a> `StaminaRegen` | `number` | - |
| <a id="weaponcrit"></a> `WeaponCrit` | `number` | - |
| <a id="weaponcritdamage"></a> `WeaponCritDamage` | `number` | - |
| <a id="weapondamage"></a> `WeaponDamage` | `number` | - |
