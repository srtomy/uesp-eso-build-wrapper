[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / isCpNodePurchaseable

# Function: isCpNodePurchaseable()

> **isCpNodePurchaseable**(`abilityId`, `nodes`, `graph`, `getPoints`): `boolean`

Convenience single-node check. Prefer [createCpGate](createCpGate.md) /
[computePurchaseableNodes](computePurchaseableNodes.md) when checking more than one node, since this
recomputes the whole flood-fill per call.

## Parameters

### abilityId

`number`

### nodes

readonly [`CpGateNode`](../interfaces/CpGateNode.md)[]

### graph

`Readonly`\<`Record`\<`number`, `number`[]\>\>

### getPoints

(`abilityId`) => `number`

## Returns

`boolean`
