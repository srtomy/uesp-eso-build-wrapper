# uesp-eso-build-wrapper

[![CI](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/srtomy/uesp-eso-build-wrapper/graph/badge.svg)](https://codecov.io/gh/srtomy/uesp-eso-build-wrapper)
[![npm](https://img.shields.io/npm/v/uesp-eso-build-wrapper.svg)](https://www.npmjs.com/package/uesp-eso-build-wrapper)
[![Docs](https://img.shields.io/badge/docs-online-2564eb)](https://srtomy.github.io/uesp-eso-build-wrapper/)
[![Bundlephobia](https://img.shields.io/bundlephobia/minzip/uesp-eso-build-wrapper)](https://bundlephobia.com/package/uesp-eso-build-wrapper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/en/download/)

> **Leia em [Português (BR)](README.pt-BR.md).**

A Node.js/TypeScript wrapper around the [UESP ESO Build Editor](https://github.com/uesp/uesp-esochardata) math engine.

Calculate Elder Scrolls Online **Computed Character Statistics** — Health, Magicka, Stamina, mitigation, crit chance, regeneration, and 200+ more — using UESP's own formulas. No formula reimplementation.

## What is this?

This is **not an HTTP client for UESP**. It runs the vendored UESP build calculation engine **locally, inside your Node.js process**, and exposes the results through a typed API:

```text
Application
    ↓
uesp-eso-build-wrapper (TypeScript API)
    ↓
Node.js compatibility layer (browser-like globals + minimal DOM)
    ↓
UESP esoEditBuild.js (executed in-process via vm.runInThisContext)
    ↓
UESP calculation functions → ComputedStats
```

You inject the inputs, UESP's own code computes every stat, you read back one typed object.

## Why this library?

- **Reference accuracy** — same `esoEditBuild.js` engine that powers [esobuilds.uesp.net](https://esobuilds.uesp.net), kept up to date by UESP every patch.
- **No formula reimplementation** — the wrapper contains zero ESO math. When a stat looks wrong after a patch, the fix is always in the game *data* fed to the engine, never in wrapper code. That is what keeps it correct across patches.
- **Local and synchronous** — `calculateBuild()` performs no network requests. The engine runs in-process; game data and items are supplied by your application (file, database, generated data).
- **Accepts UESP item data directly** — gear in the [`exportJson.php?table=minedItem`](https://esolog.uesp.net) format plugs straight into `BuildInput.items`.
- **TypeScript-native** — typed inputs/outputs, TSDoc-documented [API Reference](https://srtomy.github.io/uesp-eso-build-wrapper/api/), plus runtime catalog functions (`listAvailableBuffs`, `listRacialPassives`, …) to discover valid names.

## Key properties

- Runs the vendored UESP calculation engine locally (`vendor/uesp-esochardata`)
- **No network required for build calculations** — see [Does it require an internet connection?](https://srtomy.github.io/uesp-eso-build-wrapper/architecture#does-it-require-an-internet-connection)
- Does not reimplement ESO stat formulas
- Synchronous API; engine initializes once per process (singleton, subsequent calls are no-ops)
- Zero runtime dependencies — pure Node.js
- 221 computed stats per build

## Installation

```bash
npm install uesp-eso-build-wrapper
```

## Quick Start

Game data is not bundled in the npm package — you supply it via `initEsoEngineFromData` (see [Getting Started](https://srtomy.github.io/uesp-eso-build-wrapper/getting-started)).

```ts
import fs from 'fs';
import { initEsoEngineFromData, calculateBuild } from 'uesp-eso-build-wrapper';
import type { UespInitData } from 'uesp-eso-build-wrapper';

const initData = JSON.parse(
  fs.readFileSync('uesp-game-data.json', 'utf-8'),
) as UespInitData;

initEsoEngineFromData({ initData }); // once per process

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
console.log(stats.SpellDamage);  // 1000
```

## How it works

1. `initEsoEngineFromData({ initData })` prepares browser-like globals, seeds the engine with your game data, and executes the vendored UESP scripts via `vm.runInThisContext` — once per process.
2. `calculateBuild(input)` writes your build into the engine state, runs the engine's own `UpdateEsoComputedStatsList_Real()`, and reads results from `g_EsoComputedStats` into a typed `ComputedStats` object.

Details: [Architecture](https://srtomy.github.io/uesp-eso-build-wrapper/architecture) · [Getting Started](https://srtomy.github.io/uesp-eso-build-wrapper/getting-started) · [Reading the Output](https://srtomy.github.io/uesp-eso-build-wrapper/output).

## Documentation

Full documentation is available in **English** and **Português (BR)** at
[**srtomy.github.io/uesp-eso-build-wrapper**](https://srtomy.github.io/uesp-eso-build-wrapper/):

| Section | Description |
| --- | --- |
| [Introduction](https://srtomy.github.io/uesp-eso-build-wrapper/) | What it is, why it exists, key properties |
| [Architecture](https://srtomy.github.io/uesp-eso-build-wrapper/architecture) | Local engine, network policy, data flow |
| [Getting Started](https://srtomy.github.io/uesp-eso-build-wrapper/getting-started) | Install, game data, first calculation |
| [Guides](https://srtomy.github.io/uesp-eso-build-wrapper/guides/character) | Character, items, Champion Points, buffs, skills |
| [Reading the Output](https://srtomy.github.io/uesp-eso-build-wrapper/output) | All 221 computed stats, `debugBuild()` |
| [API Reference](https://srtomy.github.io/uesp-eso-build-wrapper/api/) | Generated from source TSDoc |
| [Troubleshooting](https://srtomy.github.io/uesp-eso-build-wrapper/troubleshooting) | Common integration issues (Next.js/serverless, wrong stats...) |
| [Contributing](https://srtomy.github.io/uesp-eso-build-wrapper/contributing) | Dev setup, tests, updating after an ESO patch |

## Limitations

- Behavior follows the vendored UESP engine version — updating ESO patch support means updating the vendored scripts + game data and running the tests.
- The engine was written for browsers around global state; the wrapper adapts it to Node.js (singleton init, synchronous calls). No concurrency guarantees beyond what the engine itself provides — see [Troubleshooting](https://srtomy.github.io/uesp-eso-build-wrapper/troubleshooting).
- Requires Node.js >= 24. Bundlers/serverless need explicit `vendor/**` inclusion (documented in Troubleshooting).

## License

MIT © srtomy

This package bundles files from [uesp/uesp-esochardata](https://github.com/uesp/uesp-esochardata) (MIT).  
See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for details.

Elder Scrolls Online is a trademark of ZeniMax Media Inc. This project is not affiliated with or endorsed by ZeniMax Media Inc.
