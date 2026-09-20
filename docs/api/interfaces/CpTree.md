[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / CpTree

# Interface: CpTree

Full Champion Points tree consumed by the editor UI and the CP gate.
Returned by [getCpTree](../functions/getCpTree.md) and derived from `cpSkillsData` +
`cpSkillDescData` + `cpDisciplinesData` + `cpClusterRootsData` + `cpLinksData`.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="clusters"></a> `clusters` | [`CpCluster`](CpCluster.md)[] | - |
| <a id="descriptions"></a> `descriptions` | `Record`\<`number`, `string`[]\> | abilityId → description indexed by invested points. |
| <a id="disciplines"></a> `disciplines` | [`CpDiscipline`](CpDiscipline.md)[] | - |
| <a id="links"></a> `links` | [`CpLink`](CpLink.md)[] | - |
| <a id="nodes"></a> `nodes` | [`CpNode`](CpNode.md)[] | - |
