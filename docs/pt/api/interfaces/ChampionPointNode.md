[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / ChampionPointNode

# Interface: ChampionPointNode

One Champion Point node in BuildInput.championPointNodes.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="currentbonus"></a> `currentBonus?` | `string` \| `number` | Numeric or percentage value of the current bonus. Legacy format for when buildRules.cp is unavailable. Ex: 1000 or "10%" |
| <a id="description"></a> `description?` | `string` | Node description override (optional). If not provided, the description is auto-resolved via g_EsoCpSkillDesc. Ex: "Grants 1 Max Magicka per stage. Current bonus: 1000" |
| <a id="isunlocked"></a> `isUnlocked?` | `boolean` | Whether the node is active/slotted in UESP. false = node has points but is not slotted (unslotted slottable nodes). When absent (old fixtures), assumed true for compatibility. |
| <a id="points"></a> `points?` | `number` | Points invested in this node. Used to auto-resolve the description via g_EsoCpSkillDesc[nodeId][points]. Required on the new path (when buildRules.cp is loaded). |
