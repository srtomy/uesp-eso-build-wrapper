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
  isUnlocked?: boolean;   // false = has points but not slotted (default: true)
}
```

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
