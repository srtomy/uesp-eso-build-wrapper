[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / computePurchaseableNodes

# Function: computePurchaseableNodes()

> **computePurchaseableNodes**(`nodes`, `graph`, `getPoints`): `Set`\<`number`\>

Flood-fill from every root, returning the set of purchaseable abilityIds for
the current allocation.

`visited` is reset at each root (as in UESP), so a node reachable from any
root counts. Traversal stops at a node whose points are below its
`jumpPointDelta`.

## Parameters

### nodes

readonly [`CpGateNode`](../interfaces/CpGateNode.md)[]

### graph

`Readonly`\<`Record`\<`number`, `number`[]\>\>

### getPoints

(`abilityId`) => `number`

## Returns

`Set`\<`number`\>
