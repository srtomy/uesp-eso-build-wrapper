[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuildDebugInfo

# Interface: BuildDebugInfo

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="computedstats"></a> `computedStats` | `Record`\<`string`, `number`\> | Todos os computed stats calculados (mesmo que raw em ComputedStats). |
| <a id="cpnodes"></a> `cpNodes` | `Record`\<`string`, [`BuildDebugCpNode`](BuildDebugCpNode.md)\> | Estado dos CP nodes: quais estavam ativos (isUnlocked) e com quantos pontos. |
| <a id="inputvalues"></a> `inputValues` | [`BuildDebugInputValues`](BuildDebugInputValues.md) | Valores de entrada por categoria, filtrados para não-zero (exceto SkillBonus/SkillLine). |
| <a id="statsources"></a> `statSources` | `Record`\<`string`, [`BuildDebugStatSource`](BuildDebugStatSource.md)[]\> | Fontes de cada input stat: registradas pelo engine durante GetEsoInputValues. Útil para rastrear de onde vem um valor inesperado (ex: qual passivo setou SkillBonusSpellDmg.Flame). |
