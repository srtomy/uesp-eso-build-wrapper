[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / CpNode

# Interface: CpNode

One CP node (cp2Skills) with the directed parent relationship resolved.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="abilityid"></a> `abilityId` | `number` | - |
| <a id="depth"></a> `depth` | `number` | Distance from the nearest root in the link graph. |
| <a id="disciplineindex"></a> `disciplineIndex` | `number` | - |
| <a id="isclusterroot"></a> `isClusterRoot` | `boolean` | - |
| <a id="isroot"></a> `isRoot` | `boolean` | - |
| <a id="jumppointdelta"></a> `jumpPointDelta` | `number` | - |
| <a id="jumppoints"></a> `jumpPoints` | `number`[] | - |
| <a id="maxpoints"></a> `maxPoints` | `number` | - |
| <a id="name"></a> `name` | `string` | - |
| <a id="parentids"></a> `parentIds` | `number`[] | Parent abilityIds, derived by BFS from the roots over the link graph. |
| <a id="skillid"></a> `skillId` | `number` | - |
| <a id="skilltype"></a> `skillType` | `number` | - |
| <a id="x"></a> `x` | `number` | - |
| <a id="y"></a> `y` | `number` | - |
