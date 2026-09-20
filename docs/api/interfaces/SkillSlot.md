[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / SkillSlot

# Interface: SkillSlot

One skill slotted on an action bar (BuildInput.skillBars).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="morphindex"></a> `morphIndex?` | `0` \| `2` \| `1` | Morph index: 0 = base, 1 = first morph, 2 = second morph. **Default** `0` |
| <a id="morphskillid"></a> `morphSkillId?` | `number` | Ability ID of the current morph (specific rank). Used as a key into g_SkillsData and in GetEsoSkillDescription to get the correct description with the slotted morph's bonuses. If absent, the engine uses skillId (for morph-less skills). |
| <a id="skillid"></a> `skillId` | `number` | Lookup key in g_EsoSkillActiveData — matches origSkillId in the Build Editor DOM (base/unmorphed skill ID). For morph-less skills it equals morphSkillId. |
