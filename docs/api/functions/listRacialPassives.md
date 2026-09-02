[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / listRacialPassives

# Function: listRacialPassives()

> **listRacialPassives**(`race`): [`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]

Returns all racial passive skills for the given race.
Each passive may appear in multiple ranks (rank 1, 2, 3).
Pass the abilityId of the desired rank to BuildInput.passiveSkills.

Must be called after initEsoEngineFromData().

## Parameters

### race

`string`

Race name as passed to BuildInput.character.race.
  Ex: "High Elf", "Nord", "Khajiit"

## Returns

[`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]
