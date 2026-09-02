[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuffEffect

# Interface: BuffEffect

Efeito individual de um buff sobre um stat.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="display"></a> `display` | `string` | Tipo de display da UESP. "%" → valor está em pontos de porcentagem (ex: 20 = 20%, ou seja 0.2 no stat final). "" → valor absoluto no mesmo sistema de unidades do stat. |
| <a id="statid"></a> `statId` | `string` | ID do stat afetado. Ex: "SpellCrit", "WeaponDamage", "CritDamage" |
| <a id="value"></a> `value` | `number` | Valor numérico do efeito (já na unidade do stat). |
