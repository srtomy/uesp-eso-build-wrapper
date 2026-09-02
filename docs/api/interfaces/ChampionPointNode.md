[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / ChampionPointNode

# Interface: ChampionPointNode

One Champion Point node in BuildInput.championPointNodes.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="currentbonus"></a> `currentBonus?` | `string` \| `number` | Valor numérico ou percentual do bônus atual. Formato legado para quando buildRules.cp não estiver disponível. Ex: 1000 ou "10%" |
| <a id="description"></a> `description?` | `string` | Override da descrição do node (opcional). Se não fornecido, a descrição é resolvida automaticamente via g_EsoCpSkillDesc. Ex: "Grants 1 Max Magicka per stage. Current bonus: 1000" |
| <a id="isunlocked"></a> `isUnlocked?` | `boolean` | Se o node está ativo/slotado no UESP. false = node tem pontos mas não está equipado (nós slotáveis não ativados). Quando ausente (fixtures antigos), assume true para compatibilidade. |
| <a id="points"></a> `points?` | `number` | Pontos investidos neste node. Usado para resolver automaticamente a descrição via g_EsoCpSkillDesc[nodeId][points]. Obrigatório no caminho novo (quando buildRules.cp estiver carregado). |
