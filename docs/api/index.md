**uesp-eso-build-wrapper v0.5.0**

***

# uesp-eso-build-wrapper v0.5.0

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
| [CpCluster](interfaces/CpCluster.md) | One CP cluster root (cp2ClusterRoots). |
| [CpDiscipline](interfaces/CpDiscipline.md) | One CP discipline (cp2Disciplines). |
| [CpGate](interfaces/CpGate.md) | A reusable, stateless gate built from a tree's nodes and links. |
| [CpGateNode](interfaces/CpGateNode.md) | Minimal node fields required by the gate. |
| [CpLink](interfaces/CpLink.md) | One CP link (cp2SkillLinks), in `skillId` space, for rendering the tree. |
| [CpNode](interfaces/CpNode.md) | One CP node (cp2Skills) with the directed parent relationship resolved. |
| [CpRawLink](interfaces/CpRawLink.md) | Raw link row in `skillId` space (`cp2SkillLinks`). |
| [CpTree](interfaces/CpTree.md) | Full Champion Points tree consumed by the editor UI and the CP gate. Returned by [getCpTree](functions/getCpTree.md) and derived from `cpSkillsData` + `cpSkillDescData` + `cpDisciplinesData` + `cpClusterRootsData` + `cpLinksData`. |
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
| [CpTreeSource](type-aliases/CpTreeSource.md) | Subset of `UespInitData` needed to assemble a [CpTree](interfaces/CpTree.md). |
| [EquipSlot](type-aliases/EquipSlot.md) | Equipment slots accepted by BuildInput.items. |

## Functions

| Function | Description |
| ------ | ------ |
| [buildCpLinks](functions/buildCpLinks.md) | Maps raw `cp2SkillLinks` rows (skillId space) to the abilityId adjacency graph — the equivalent of the UESP `g_EsoCpLinks` global (`CreateCp2LinksData`). Kept symmetric: each edge appears in both directions, exactly as the dump provides it. |
| [buildCpParentMap](functions/buildCpParentMap.md) | `childAbilityId → [parentAbilityIds]` (inverse of a children map). |
| [buildCpTree](functions/buildCpTree.md) | Assembles a [CpTree](interfaces/CpTree.md) from extracted `cp2*` data. Pure and testable. |
| [calculateBuild](functions/calculateBuild.md) | Calculates the Computed Character Statistics for the given build. |
| [computePurchaseableNodes](functions/computePurchaseableNodes.md) | Flood-fill from every root, returning the set of purchaseable abilityIds for the current allocation. |
| [createCpGate](functions/createCpGate.md) | Builds a reusable gate from a tree's nodes and links. |
| [debugBuild](functions/debugBuild.md) | Runs calculateBuild and returns detailed diagnostic information about the engine state. Useful for debugging discrepancies between expected and computed stats. |
| [getCpTree](functions/getCpTree.md) | Returns the Champion Points tree, built once per process from the engine globals. Must be called after `initEsoEngineFromData()`. |
| [initEsoEngineFromData](functions/initEsoEngineFromData.md) | Initializes the UESP math engine from a pre-parsed `UespInitData` object. |
| [isCpNodePurchaseable](functions/isCpNodePurchaseable.md) | Convenience single-node check. Prefer [createCpGate](functions/createCpGate.md) / [computePurchaseableNodes](functions/computePurchaseableNodes.md) when checking more than one node, since this recomputes the whole flood-fill per call. |
| [listAvailableBuffs](functions/listAvailableBuffs.md) | Returns the catalog of buffs available in the loaded UESP engine. |
| [listAvailableSkillLines](functions/listAvailableSkillLines.md) | Returns all skill line names that have passive skills available. Use the returned names with listPassivesBySkillLine(). |
| [listAvailableToggleSkills](functions/listAvailableToggleSkills.md) | Returns all available toggle skills from the loaded UESP engine. Pass entry.name to BuildInput.toggleSkills to enable it. |
| [listClassPassives](functions/listClassPassives.md) | Returns all class passive skills for the given class. Each passive may appear in multiple ranks (rank 1, 2, 3). Pass the abilityId of the desired rank to BuildInput.passiveSkills. |
| [listInherentPassives](functions/listInherentPassives.md) | Returns the game's inherent passives — the entries of the UESP `ESO_FREE_PASSIVES` list that are passives (Light/Medium/Heavy Armor Bonuses and Penalties, racial, craft). The UESP Build Editor loads them by itself; pass `BuildInput.autoInherentPassives: true` to apply them here, or use this list to mark them as owned in a UI. |
| [listPassivesBySkillLine](functions/listPassivesBySkillLine.md) | Returns all passive skills for the given skill line. Each passive may appear in multiple ranks (rank 1, 2, 3). Pass the abilityId of the desired rank to BuildInput.passiveSkills. |
| [listRacialPassives](functions/listRacialPassives.md) | Returns all racial passive skills for the given race. Each passive may appear in multiple ranks (rank 1, 2, 3). Pass the abilityId of the desired rank to BuildInput.passiveSkills. |
| [resetCpTreeCache](functions/resetCpTreeCache.md) | Clears the memoized tree — called when the engine is (re)loaded. |

## References

### default

Renames and re-exports [calculateBuild](functions/calculateBuild.md)
