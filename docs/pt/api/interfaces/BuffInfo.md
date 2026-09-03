[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuffInfo

# Interface: BuffInfo

Info about a buff available in the engine catalog.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="effects"></a> `effects` | [`BuffEffect`](BuffEffect.md)[] | Effects on stats when enabled. |
| <a id="group"></a> `group` | [`BuffGroup`](../type-aliases/BuffGroup.md) | Buff group — matches the UESP interface tabs. |
| <a id="icon"></a> `icon` | `string` | Relative icon URL on UESP. Ex: "/esoui/art/icons/ability_debuff_major_cowardice.png" |
| <a id="istoggle"></a> `isToggle` | `boolean` | True if this buff is a toggle (can be switched on/off in the tab). |
| <a id="isvisible"></a> `isVisible` | `boolean` | True if this buff is visible in the UESP buff tab. |
| <a id="name"></a> `name` | `string` | Exact name to pass in `activeBuffs`. Ex: "Major Prophecy" |
