[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / listClassPassives

# Function: listClassPassives()

> **listClassPassives**(`className`): [`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]

Returns all class passive skills for the given class.
Each passive may appear in multiple ranks (rank 1, 2, 3).
Pass the abilityId of the desired rank to BuildInput.passiveSkills.

Must be called after initEsoEngineFromData().

## Parameters

### className

`string`

Class name as passed to BuildInput.character.class.
  Ex: "Sorcerer", "Nightblade", "Dragonknight"

## Returns

[`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]
