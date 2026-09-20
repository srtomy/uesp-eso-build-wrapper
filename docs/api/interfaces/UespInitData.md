[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / UespInitData

# Interface: UespInitData

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="buffdata"></a> `buffData?` | `Record`\<`string`, `unknown`\> | Initial buff data |
| <a id="buildrules"></a> `buildRules?` | `Record`\<`string`, `unknown`\> | General build rules |
| <a id="computedstats"></a> `computedStats` | `Record`\<`string`, `unknown`\> | Stat calculation formulas (the engine's "brains") |
| <a id="cpclusterrootsdata"></a> `cpClusterRootsData?` | `Record`\<`string`, `unknown`\>[] | CP2 cluster roots (cp2ClusterRoots). |
| <a id="cpdata"></a> `cpData?` | `Record`\<`string`, `unknown`\> | Initial Champion Points data |
| <a id="cpdisciplinesdata"></a> `cpDisciplinesData?` | `Record`\<`string`, `unknown`\>[] | CP2 disciplines (cp2Disciplines). |
| <a id="cplinksdata"></a> `cpLinksData?` | `Record`\<`string`, `number`[]\> | CP2 adjacency graph in abilityId space — the equivalent of the UESP `g_EsoCpLinks` global. Symmetric (each edge appears in both directions). Derivation: `cp2SkillLinks` rows mapped from skillId to abilityId (UESP `CreateCp2LinksData`). |
| <a id="cpskilldescdata"></a> `cpSkillDescData?` | `Record`\<`string`, `Record`\<`string`, `string`\>\> | CP2 node descriptions by points level: cpSkillDescData[nodeId][points] |
| <a id="cpskillsdata"></a> `cpSkillsData?` | `Record`\<`string`, `unknown`\> | CP2 node metadata: name, discipline, cluster, graph position |
| <a id="setskillsdata"></a> `setSkillsData?` | `Record`\<`string`, `unknown`\> | Set skill data |
| <a id="skillsdata"></a> `skillsData?` | `Record`\<`string`, `unknown`\> | Complete UESP skill database (race/class passives, actives, set skills). Captured from window.g_SkillsData after en.uesp.net/wiki/Special:EsoBuildEditor loads. Required for GetEsoSkillDescription to interpolate coefficients into texts. |
