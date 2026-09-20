[**uesp-eso-build-wrapper v0.5.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / getCpTree

# Function: getCpTree()

> **getCpTree**(): [`CpTree`](../interfaces/CpTree.md)

Returns the Champion Points tree, built once per process from the engine
globals. Must be called after `initEsoEngineFromData()`.

The returned object is read-only — treat it as immutable (it is shared).

## Returns

[`CpTree`](../interfaces/CpTree.md)
