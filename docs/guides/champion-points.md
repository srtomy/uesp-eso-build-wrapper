---
title: Champion Points
---

# Champion Points

Champion Points have two pieces:

1. `character.championPoints` — the **total** (0–3600). This must be greater than zero for any node to apply.
2. `championPointNodes` — the **distribution**: which nodes have points and how many.

```ts
const stats = calculateBuild({
  character: {
    /* ... */
    championPoints: 160,
  },
  championPointNodes: {
    38750: { points: 100 }, // node id → invested points
  },
});
```

## Node format

```ts
interface ChampionPointNode {
  points?: number;        // invested points — resolves the description automatically
  description?: string;   // explicit description override (optional)
  currentBonus?: number | string; // legacy format fallback
  isUnlocked?: boolean;   // whether the node's effect applies (see below)
}
```

### `isUnlocked` default

When `isUnlocked` is omitted, it is derived from the node metadata:

- **Passives** (`skillType 0`): `points >= jumpPointDelta`.
- **Slottable nodes** (`skillType 1/2`): defaults to **`false`**, because the
  wrapper cannot know whether the node is on the Champion bar. Pass
  `isUnlocked: true` for nodes that are slotted.

Previously every node without an explicit `isUnlocked` was treated as active,
which over-counted nodes that were invested but not slotted.

### New path (recommended)

When the game data contains `buildRules.cp` (current `uesp-game-data.json` does), pass `points` and let the engine resolve the node's effect from its description table:

```ts
championPointNodes: {
  38750: { points: 100 }, // "Grants 1 Max Magicka per stage" → resolved automatically
}
```

### Legacy path

If `buildRules.cp` is unavailable (older data), pass the resolved bonus text/value directly:

```ts
championPointNodes: {
  141744: { currentBonus: 1000 },          // flat value
  141745: { currentBonus: '10%' },         // or a percentage
}
```

### Slotted vs unlocked

Some nodes are slotable. `isUnlocked: false` means the node has points but is **not** equipped, so its passive does not apply:

```ts
championPointNodes: {
  38750: { points: 100 },                     // active
  38751: { points: 50, isUnlocked: false },   // invested but not slotted
}
```

## Which node IDs exist?

Node IDs are the UESP CP rule/ability IDs. The easiest way to get the correct ID for a node is the UESP Build Editor itself: configure the CP there and export the build with [`scripts/browser-export-build.js`](https://github.com/srtomy/uesp-eso-build-wrapper#validating-against-the-uesp-browser) — the export contains `championPointNodes` exactly as this library expects it.

## The CP tree and the purchaseability gate

The wrapper owns the CP tree data (disciplines, nodes, links, clusters and
per-point descriptions). Use it to render a planner and to decide which nodes
can be bought for a given allocation.

```ts
import { getCpTree, createCpGate } from 'uesp-eso-build-wrapper';

initEsoEngineFromData({ initData });

const tree = getCpTree();
// tree.nodes      CpNode[]      (abilityId, skillId, parentIds, depth, x/y, ...)
// tree.links      CpLink[]      (skillId-space edges, symmetric)
// tree.clusters   CpCluster[]
// tree.disciplines CpDiscipline[]
// tree.descriptions Record<abilityId, string[]>

const gate = createCpGate(tree.nodes, tree.links);

// allocation: abilityId -> invested points
const purchaseable = gate.purchaseable((id) => invested[id] ?? 0);
purchaseable.has(141895); // can this node be bought right now?
```

`getCpTree()` is built once per process from the loaded engine data and is
cached (read-only). `createCpGate` is stateless: pass the current allocation via
the `getPoints` callback and recompute whenever points change.

### Browser / bundler usage

The gate is pure (no Node APIs), so it is published as its own subpath for
client-side use without pulling the engine (which reads `fs`/`vm`):

```ts
import { createCpGate, isCpNodePurchaseable } from 'uesp-eso-build-wrapper/cp-gate';
```

The gate is a faithful port of the UESP esolog algorithm
(`CreateCp2UnlockData` / `UpdateCP2SkillPurchaseable`): a node is purchaseable
when it is reachable from a root along the (symmetric) link graph, where every
node you traverse *through* has `points >= jumpPointDelta`.

## Regenerating the CP data

`cpDisciplinesData`, `cpClusterRootsData` and the derived `cpLinksData`
(abilityId adjacency, the `g_EsoCpLinks` equivalent) are extracted from the
`cp*.sql.gz` dumps together with `cpSkillsData` / `cpSkillDescData`:
`npm run db:seed`.
