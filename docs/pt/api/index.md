**uesp-eso-build-wrapper v0.3.0**

***

# uesp-eso-build-wrapper v0.3.0

## Interfaces

| Interface | Description |
| ------ | ------ |
| [BuffEffect](interfaces/BuffEffect.md) | A single buff effect on a stat. |
| [BuffInfo](interfaces/BuffInfo.md) | Info about a buff available in the engine catalog. |
| [BuildDebugCpNode](interfaces/BuildDebugCpNode.md) | State of a single Champion Point node during the calculation. |
| [BuildDebugInfo](interfaces/BuildDebugInfo.md) | - |
| [BuildDebugInputValues](interfaces/BuildDebugInputValues.md) | Per-category input values captured during the calculation (non-zero only). |
| [BuildDebugStatSource](interfaces/BuildDebugStatSource.md) | One contribution to an input stat: which source (passive, CP, buff, set...) set it. |
| [BuildInput](interfaces/BuildInput.md) | Complete input for calculateBuild(): character sheet plus everything the character "has" — items, Champion Points, buffs, toggle skills, skill bars and passives. |
| [ChampionPointNode](interfaces/ChampionPointNode.md) | One Champion Point node in BuildInput.championPointNodes. |
| [ComputedStats](interfaces/ComputedStats.md) | The result of calculateBuild(): the key stats as named properties, plus `raw` with all 221 computed stats from the UESP engine. |
| [EsoEngineFromDataOptions](interfaces/EsoEngineFromDataOptions.md) | Options for [initEsoEngineFromData](functions/initEsoEngineFromData.md). |
| [PassiveSkillInfo](interfaces/PassiveSkillInfo.md) | One passive skill at a specific rank, as returned by the `list*Passives()` catalog functions. |
| [SkillSlot](interfaces/SkillSlot.md) | One skill slotted on an action bar (BuildInput.skillBars). |
| [ToggleSkillInfo](interfaces/ToggleSkillInfo.md) | One toggle skill from the UESP toggle tab, as returned by listAvailableToggleSkills(). |
| [UespInitData](interfaces/UespInitData.md) | - |
| [UespItemApiData](interfaces/UespItemApiData.md) | Item data as returned by the UESP public item API (esolog.uesp.net/exportJson.php?table=minedItem). Pass the object straight into BuildInput.items[slot] — no transformation needed. All fields are strings, exactly as the API returns them. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [BuffGroup](type-aliases/BuffGroup.md) | Buff group, matching the UESP UI tabs. |
| [EquipSlot](type-aliases/EquipSlot.md) | Equipment slots accepted by BuildInput.items. |

## Functions

| Function | Description |
| ------ | ------ |
| [calculateBuild](functions/calculateBuild.md) | Calculates the Computed Character Statistics for the given build. |
| [debugBuild](functions/debugBuild.md) | Runs calculateBuild and returns detailed diagnostic information about the engine state. Useful for debugging discrepancies between expected and computed stats. |
| [initEsoEngineFromData](functions/initEsoEngineFromData.md) | Initializes the UESP math engine from a pre-parsed `UespInitData` object. |
| [listAvailableBuffs](functions/listAvailableBuffs.md) | Returns the catalog of buffs available in the loaded UESP engine. |
| [listAvailableSkillLines](functions/listAvailableSkillLines.md) | Returns all skill line names that have passive skills available. Use the returned names with listPassivesBySkillLine(). |
| [listAvailableToggleSkills](functions/listAvailableToggleSkills.md) | Returns all available toggle skills from the loaded UESP engine. Pass entry.name to BuildInput.toggleSkills to enable it. |
| [listClassPassives](functions/listClassPassives.md) | Returns all class passive skills for the given class. Each passive may appear in multiple ranks (rank 1, 2, 3). Pass the abilityId of the desired rank to BuildInput.passiveSkills. |
| [listPassivesBySkillLine](functions/listPassivesBySkillLine.md) | Returns all passive skills for the given skill line. Each passive may appear in multiple ranks (rank 1, 2, 3). Pass the abilityId of the desired rank to BuildInput.passiveSkills. |
| [listRacialPassives](functions/listRacialPassives.md) | Returns all racial passive skills for the given race. Each passive may appear in multiple ranks (rank 1, 2, 3). Pass the abilityId of the desired rank to BuildInput.passiveSkills. |

## References

### default

Renames and re-exports [calculateBuild](functions/calculateBuild.md)
