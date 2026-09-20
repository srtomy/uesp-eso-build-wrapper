[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / CpGate

# Interface: CpGate

A reusable, stateless gate built from a tree's nodes and links.

## Methods

### isPurchaseable()

> **isPurchaseable**(`abilityId`, `getPoints`): `boolean`

Whether a single node is purchaseable for the current allocation.

#### Parameters

##### abilityId

`number`

##### getPoints

(`abilityId`) => `number`

#### Returns

`boolean`

***

### purchaseable()

> **purchaseable**(`getPoints`): `Set`\<`number`\>

All nodes purchaseable for the current allocation.

#### Parameters

##### getPoints

(`abilityId`) => `number`

#### Returns

`Set`\<`number`\>
