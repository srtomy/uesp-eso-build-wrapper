[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / buildCpLinks

# Function: buildCpLinks()

> **buildCpLinks**(`links`, `skillIdToAbilityId`): `Record`\<`number`, `number`[]\>

Maps raw `cp2SkillLinks` rows (skillId space) to the abilityId adjacency
graph — the equivalent of the UESP `g_EsoCpLinks` global
(`CreateCp2LinksData`). Kept symmetric: each edge appears in both directions,
exactly as the dump provides it.

## Parameters

### links

readonly [`CpRawLink`](../interfaces/CpRawLink.md)[]

### skillIdToAbilityId

`ReadonlyMap`\<`number`, `number`\>

## Returns

`Record`\<`number`, `number`[]\>
