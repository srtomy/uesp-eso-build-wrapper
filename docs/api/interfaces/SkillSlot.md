[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / SkillSlot

# Interface: SkillSlot

One skill slotted on an action bar (BuildInput.skillBars).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="morphindex"></a> `morphIndex?` | `0` \| `2` \| `1` | Índice do morph: 0 = base, 1 = primeiro morph, 2 = segundo morph. **Default** `0` |
| <a id="morphskillid"></a> `morphSkillId?` | `number` | Ability ID do morph atual (rank específico). Usado como chave em g_SkillsData e em GetEsoSkillDescription para obter a descrição correta com os bônus do morph equipado. Se ausente, o engine usa skillId (para skills sem morph). |
| <a id="skillid"></a> `skillId` | `number` | Chave de lookup em g_EsoSkillActiveData — corresponde a origSkillId no DOM do Build Editor (ID do skill base/sem morph). Para skills sem morph, é igual a morphSkillId. |
