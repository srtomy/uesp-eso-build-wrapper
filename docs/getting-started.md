---
title: Getting Started
---

# Getting Started

## Requirements

- **Node.js >= 24** (see `engines` in package.json)

## Installation

```bash
npm install uesp-eso-build-wrapper
```

## Game data

Game data (`UespInitData`) is **not bundled in the npm package** — the library ships only the engine scripts. You supply the data when initializing.

The canonical source is [`vendor/uesp-data/uesp-game-data.json`](https://github.com/srtomy/uesp-eso-build-wrapper/blob/main/vendor/uesp-data/uesp-game-data.json), committed to the repository and refreshed after each ESO patch. Its `_meta` field records which patch it was generated from — pin or update your copy deliberately so your numbers always match a known game version.

Ways to obtain it:

1. **Copy from the repo** — download `uesp-game-data.json` from the repository above and load it with `fs.readFileSync`.

The wrapper does not ship a data-acquisition pipeline: the artifact is committed to the repo and the public package never fetches from UESP.

## Initialize the engine

Call `initEsoEngineFromData()` **once per process**, before any calculation. Subsequent calls are no-ops.

```ts
import fs from 'fs';
import { initEsoEngineFromData } from 'uesp-eso-build-wrapper';
import type { UespInitData } from 'uesp-eso-build-wrapper';

const initData = JSON.parse(
  fs.readFileSync('uesp-game-data.json', 'utf-8'),
) as UespInitData;

initEsoEngineFromData({ initData });
```

## Your first calculation

```ts
import { calculateBuild } from 'uesp-eso-build-wrapper';

const stats = calculateBuild({
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
  },
});

console.log(stats.Health);       // 16000
console.log(stats.Magicka);      // 19104
console.log(stats.MagickaRegen); // 514
console.log(stats.SpellDamage);  // 1000
```

The result object also carries `stats.raw` — all 204 stats as a plain record. See [Reading the Output](/output).

## Next steps

- [Character](/guides/character) — every character-sheet field
- [Items & Equipment](/guides/items) — gear payloads
- [Champion Points](/guides/champion-points) — CP nodes
- [Buffs & Toggle Skills](/guides/buffs-and-toggles) — named buffs and toggles
- [Skills & Passives](/guides/skills) — skill bars, morphs, passives
