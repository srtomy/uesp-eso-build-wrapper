# uesp-eso-build-wrapper

[![CI](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/srtomy/uesp-eso-build-wrapper/graph/badge.svg)](https://codecov.io/gh/srtomy/uesp-eso-build-wrapper)
[![npm](https://img.shields.io/npm/v/uesp-eso-build-wrapper.svg)](https://www.npmjs.com/package/uesp-eso-build-wrapper)
[![Docs](https://img.shields.io/badge/docs-online-2564eb)](https://srtomy.github.io/uesp-eso-build-wrapper/)
[![Bundlephobia](https://img.shields.io/bundlephobia/minzip/uesp-eso-build-wrapper)](https://bundlephobia.com/package/uesp-eso-build-wrapper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/en/download/)

A Node.js/TypeScript wrapper around the [UESP ESO Build Editor](https://github.com/uesp/uesp-esochardata) math engine.

Calculate Elder Scrolls Online **Computed Character Statistics** — Health, Magicka, Stamina, mitigation, crit chance, regeneration, and 200+ more — using UESP's own formulas. No formula reimplementation.

## Features

- ✅ **100% UESP formulas** — same engine powering [esobuilds.uesp.net](https://esobuilds.uesp.net)
- ✅ **221 computed stats** — all `Computed Character Statistics` from the build editor
- ✅ **Zero runtime dependencies** — pure Node.js
- ✅ **Full TypeScript types** — typed inputs and outputs
- ✅ **Singleton loader** — loads the engine once per process, fast on subsequent calls

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

## Documentation

Full documentation is available in **English** and **Português (BR)** at
[**srtomy.github.io/uesp-eso-build-wrapper**](https://srtomy.github.io/uesp-eso-build-wrapper/):

| Section | Description |
| --- | --- |
| [Getting Started](https://srtomy.github.io/uesp-eso-build-wrapper/getting-started) | Install, game data, first calculation |
| [Guides](https://srtomy.github.io/uesp-eso-build-wrapper/guides/character) | Character, items, Champion Points, buffs, skills |
| [Reading the Output](https://srtomy.github.io/uesp-eso-build-wrapper/output) | All 221 computed stats, `debugBuild()` |
| [API Reference](https://srtomy.github.io/uesp-eso-build-wrapper/api/) | Generated from source TSDoc |
| [Troubleshooting](https://srtomy.github.io/uesp-eso-build-wrapper/troubleshooting) | Common integration issues (Next.js/serverless, wrong stats...) |
| [Contributing](https://srtomy.github.io/uesp-eso-build-wrapper/contributing) | Dev setup, tests, updating after an ESO patch |

## Game data

Game data (`UespInitData`) comes from the UESP SQL dumps and lives in `vendor/uesp-data/uesp-game-data.json` (committed to this repo, `_meta` records the patch). Consumers supply their own copy — generation options in [Getting Started](https://srtomy.github.io/uesp-eso-build-wrapper/getting-started).

## License

MIT © srtomy

This package bundles files from [uesp/uesp-esochardata](https://github.com/uesp/uesp-esochardata) (MIT).  
See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for details.

Elder Scrolls Online is a trademark of ZeniMax Media Inc. This project is not affiliated with or endorsed by ZeniMax Media Inc.
