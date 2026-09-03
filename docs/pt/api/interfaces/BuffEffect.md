[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuffEffect

# Interface: BuffEffect

A single buff effect on a stat.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="display"></a> `display` | `string` | UESP display type. "%" → value is in percentage points (e.g. 20 = 20%, i.e. 0.2 on the final stat). "" → absolute value in the same unit system as the stat. |
| <a id="statid"></a> `statId` | `string` | Affected stat ID. Ex: "SpellCrit", "WeaponDamage", "CritDamage" |
| <a id="value"></a> `value` | `number` | Numeric effect value (already in the stat's unit). |
