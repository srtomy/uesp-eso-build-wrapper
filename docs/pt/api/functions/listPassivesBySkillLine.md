[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / listPassivesBySkillLine

# Function: listPassivesBySkillLine()

> **listPassivesBySkillLine**(`skillLine`): [`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]

Returns all passive skills for the given skill line.
Each passive may appear in multiple ranks (rank 1, 2, 3).
Pass the abilityId of the desired rank to BuildInput.passiveSkills.

Must be called after initEsoEngineFromData().

## Parameters

### skillLine

`string`

Skill line name as it appears in g_SkillsData.
  Use listAvailableSkillLines() to discover valid names.
  Examples: "Light Armor", "Heavy Armor", "Undaunted", "Destruction Staff",
  "Fighters Guild", "Mages Guild", "Psijic Order", "Assault", "Support",
  "Vampire", "Werewolf"

## Returns

[`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]
