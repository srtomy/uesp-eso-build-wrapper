[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / listAvailableBuffs

# Function: listAvailableBuffs()

> **listAvailableBuffs**(`group?`): [`BuffInfo`](../interfaces/BuffInfo.md)[]

Returns the catalog of buffs available in the loaded UESP engine.

Each entry maps to one row in the UESP buff tab. Pass `entry.name` to
`BuildInput.activeBuffs` to enable that buff in a calculation.

Must be called after `initEsoEngineFromData()`.

## Parameters

### group?

`string`

Optional filter. Ex: "Major", "Minor", "Set", "Target",
  "Skill", "Potion", "Poison", "Cyrodiil", "Other".
  Omit to return all 164 buffs.

## Returns

[`BuffInfo`](../interfaces/BuffInfo.md)[]
