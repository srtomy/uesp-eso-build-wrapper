[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuildDebugInfo

# Interface: BuildDebugInfo

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="computedstats"></a> `computedStats` | `Record`\<`string`, `number`\> | All computed stats (same as raw in ComputedStats). |
| <a id="cpnodes"></a> `cpNodes` | `Record`\<`string`, [`BuildDebugCpNode`](BuildDebugCpNode.md)\> | CP node state: which were active (isUnlocked) and with how many points. |
| <a id="inputvalues"></a> `inputValues` | [`BuildDebugInputValues`](BuildDebugInputValues.md) | Input values by category, filtered to non-zero (except SkillBonus/SkillLine). |
| <a id="statsources"></a> `statSources` | `Record`\<`string`, [`BuildDebugStatSource`](BuildDebugStatSource.md)[]\> | Sources of each input stat: recorded by the engine during GetEsoInputValues. Useful for tracing where an unexpected value comes from (e.g. which passive set SkillBonusSpellDmg.Flame). |
