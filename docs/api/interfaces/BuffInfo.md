[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuffInfo

# Interface: BuffInfo

Informações de um buff disponível no catálogo do motor.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="effects"></a> `effects` | [`BuffEffect`](BuffEffect.md)[] | Efeitos sobre os stats quando ativado. |
| <a id="group"></a> `group` | [`BuffGroup`](../type-aliases/BuffGroup.md) | Grupo do buff — corresponde às abas da interface da UESP. |
| <a id="icon"></a> `icon` | `string` | URL relativa do ícone na UESP. Ex: "/esoui/art/icons/ability_debuff_major_cowardice.png" |
| <a id="istoggle"></a> `isToggle` | `boolean` | True se este buff é um toggle (pode ser ligado/desligado na aba). |
| <a id="isvisible"></a> `isVisible` | `boolean` | True se este buff está visível na aba de buffs da UESP. |
| <a id="name"></a> `name` | `string` | Nome exato a passar em `activeBuffs`. Ex: "Major Prophecy" |
