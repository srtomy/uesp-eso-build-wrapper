[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / listAvailableToggleSkills

# Function: listAvailableToggleSkills()

> **listAvailableToggleSkills**(): [`ToggleSkillInfo`](../interfaces/ToggleSkillInfo.md)[]

Returns all available toggle skills from the loaded UESP engine.
Pass entry.name to BuildInput.toggleSkills to enable it.

Note: toggle skills with requiresCyrodiil=true also need character.cyrodiil=true.
Toggle skills backed by a passive (isPassive=true) need the associated skill
in passiveSkills/skillBars for the engine to process the description match.

Must be called after initEsoEngineFromData().

## Returns

[`ToggleSkillInfo`](../interfaces/ToggleSkillInfo.md)[]
