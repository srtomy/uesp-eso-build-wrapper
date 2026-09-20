[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / createCpGate

# Function: createCpGate()

> **createCpGate**(`nodes`, `links`): [`CpGate`](../interfaces/CpGate.md)

Builds a reusable gate from a tree's nodes and links.

The link graph is translated from `skillId` space to `abilityId` space using
the nodes' own mapping, so callers only need the tree — not `cpLinksData`.

## Parameters

### nodes

readonly [`CpNode`](../interfaces/CpNode.md)[]

### links

readonly [`CpLink`](../interfaces/CpLink.md)[]

## Returns

[`CpGate`](../interfaces/CpGate.md)
