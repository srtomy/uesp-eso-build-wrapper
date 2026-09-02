[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / UespInitData

# Interface: UespInitData

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="buffdata"></a> `buffData?` | `Record`\<`string`, `unknown`\> | Dados de buffs iniciais |
| <a id="buildrules"></a> `buildRules?` | `Record`\<`string`, `unknown`\> | Regras gerais da build |
| <a id="computedstats"></a> `computedStats` | `Record`\<`string`, `unknown`\> | Fórmulas de cálculo dos stats (a "inteligência" do motor) |
| <a id="cpdata"></a> `cpData?` | `Record`\<`string`, `unknown`\> | Dados de Champion Points iniciais |
| <a id="cpskilldescdata"></a> `cpSkillDescData?` | `Record`\<`string`, `Record`\<`string`, `string`\>\> | Descrições dos nodes CP2 por nível de pontos: cpSkillDescData[nodeId][points] |
| <a id="cpskillsdata"></a> `cpSkillsData?` | `Record`\<`string`, `unknown`\> | Metadados dos nodes CP2: nome, disciplina, cluster, posição no grafo |
| <a id="setskillsdata"></a> `setSkillsData?` | `Record`\<`string`, `unknown`\> | Dados de skills de sets |
| <a id="skillsdata"></a> `skillsData?` | `Record`\<`string`, `unknown`\> | Banco completo de skills da UESP (race/class passivos, activos, set skills). Capturado de window.g_SkillsData após a página en.uesp.net/wiki/Special:EsoBuildEditor carregar. Necessário para que GetEsoSkillDescription interpole coeficientes nos textos. |
