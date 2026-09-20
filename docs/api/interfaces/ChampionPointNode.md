[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / ChampionPointNode

# Interface: ChampionPointNode

One Champion Point node in BuildInput.championPointNodes.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="currentbonus"></a> `currentBonus?` | `string` \| `number` | Numeric or percentage value of the current bonus. Legacy format for when buildRules.cp is unavailable. Ex: 1000 or "10%" |
| <a id="description"></a> `description?` | `string` | Node description override (optional). If not provided, the description is auto-resolved via g_EsoCpSkillDesc. Ex: "Grants 1 Max Magicka per stage. Current bonus: 1000" |
| <a id="isunlocked"></a> `isUnlocked?` | `boolean` | Whether the node's effect applies. `false` = node has points but is not active (unslotted slottable nodes, or below the first stage). When absent, it is derived from the node metadata and its points: `points >= jumpPointDelta` for passives (`skillType === 0`); for slottable nodes (`skillType 1/2`) it defaults to `false`, since the wrapper cannot know whether the node is on the Champion bar. Pass it explicitly when the node is slotted. |
| <a id="points"></a> `points?` | `number` | Points invested in this node. Used to auto-resolve the description via g_EsoCpSkillDesc[nodeId][points]. Required on the new path (when buildRules.cp is loaded). |
