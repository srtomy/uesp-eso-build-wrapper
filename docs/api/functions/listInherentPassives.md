[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / listInherentPassives

# Function: listInherentPassives()

> **listInherentPassives**(): [`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]

Returns the game's inherent passives — the entries of the UESP
`ESO_FREE_PASSIVES` list that are passives (Light/Medium/Heavy Armor Bonuses
and Penalties, racial, craft). The UESP Build Editor loads them by itself;
pass `BuildInput.autoInherentPassives: true` to apply them here, or use this
list to mark them as owned in a UI.

Free-list entries that are actives/ultimates (Soul Trap, Werewolf
Transformation, Scribing/Volendrung skills) are not passives and are omitted.

Must be called after initEsoEngineFromData().

## Returns

[`PassiveSkillInfo`](../interfaces/PassiveSkillInfo.md)[]
