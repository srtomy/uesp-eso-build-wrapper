---
title: Architecture
---

# Architecture

`uesp-eso-build-wrapper` is a Node.js/TypeScript wrapper around the UESP ESO build calculation engine. It runs the vendored UESP engine locally, provides the browser-like environment it expects, supplies the required game/build data, and exposes the calculated statistics through a Node-friendly API.

```text
Application
    ↓
uesp-eso-build-wrapper (typed API: initEsoEngineFromData / calculateBuild / debugBuild)
    ↓
Node.js compatibility layer (browser-like globals + minimal DOM surface)
    ↓
UESP engine (esoEditBuild.js + esobuilddata.js, executed in-process via vm.runInThisContext)
    ↓
ComputedStats (221 stats read from g_EsoComputedStats)
```

## Does it require an internet connection?

**Build calculations do not require network access.** `calculateBuild()` is synchronous and performs no HTTP requests: the engine runs inside the Node.js process and all data it needs is supplied locally by your application.

| Concern           | Where it runs        | Network?                              |
| ----------------- | -------------------- | ------------------------------------- |
| UESP engine       | local, in-process    | no                                    |
| Build calculation | local, in-process    | no                                    |
| Game data         | local input          | no (you load it from file/DB/memory)  |
| External data     | application choice   | optional — your responsibility        |

Fetching item data from `esolog.uesp.net/exportJson.php` or downloading fresh SQL dumps happens **outside** the calculation path: your application may do it to *obtain* inputs, but the wrapper never calls the network to *compute*.

## How the UESP engine runs in Node.js

The original UESP code was written for browsers: it assumes `window` globals, jQuery (`$("#esotbRace").val()`, …) and a DOM. The wrapper does not import it as a module — it **executes the vendored scripts in the Node.js VM context** (`vm.runInThisContext` in `src/lib/eso-engine/loader.ts`), after preparing what the engine expects:

```text
Node.js
  ├── prepare browser-like globals (window, document, navigator, jQuery mock)
  ├── prepare UESP global variables (g_EsoComputedStats, g_EsoInputStats, g_EsoBuildRules, …)
  ├── seed game data from initData (formulas, buffs, CP rules, skills)
  ▼
vm.runInThisContext(esobuilddata.js → esoEditBuild.js)
  ▼
UESP engine ready (UpdateEsoComputedStatsList_Real, g_EsoComputedStats, …)
```

## Why a browser-like environment exists

Because the engine was never designed as a Node.js library. The wrapper's `env-setup.ts` provides the minimal surface the engine reads — a value/attribute/text store behind a chainable jQuery mock — so calls like `$("#esotbRace").val()` work without a real DOM. Only what the engine actually touches is stubbed; nothing more.

## Game data vs engine vs items

| Data      | Purpose                        | Source                                                        |
| --------- | ------------------------------ | ------------------------------------------------------------- |
| Engine    | build/stat calculations        | vendored UESP scripts (`vendor/uesp-esochardata/resources/`)  |
| Game data | engine initialization (`UespInitData`: formulas, buffs, CP rules, skills…) | supplied by the application — copy `vendor/uesp-data/uesp-game-data.json` or generate via `npm run generate-data` |
| Item data | build equipment (`BuildInput.items`) | supplied per build, straight from the UESP item API (`exportJson.php?table=minedItem`) |

## Calculating a build

```ts
const result = calculateBuild(buildInput);
```

```text
BuildInput (character, items, CP, buffs, skills)
    ↓
engine state (mock DOM values + g_EsoBuildItemData + g_EsoCpData + buff/toggle tables)
    ↓
UpdateEsoComputedStatsList_Real(null, true)  — the engine's own entry point
    ↓
g_EsoComputedStats (every stat's .value updated in place)
    ↓
ComputedStats (named keys + raw record with all 221 stats)
```

`debugBuild(input)` runs the same calculation and additionally returns every input value per category and which source contributed each stat — a diagnostic tool for investigating discrepancies, not a production path.

## No reimplementation of ESO formulas

> This library does not reimplement ESO's stat calculation formulas.

It reuses UESP's reference implementation:

```text
Original UESP calculation engine
              ↓
      wrapper API
              ↓
   local application
```

That removes duplication — and it means library behavior is pinned to the vendored engine version. After an ESO patch: update the vendored scripts, regenerate game data, run the tests.

## Engine state

The original engine is built around global state, and the wrapper adapts that to Node.js:

- `initEsoEngineFromData({ initData })` initializes that state **once per process** — subsequent calls are no-ops (see `src/lib/eso-engine/index.ts`).
- Each `calculateBuild()` starts from a clean slate (items, buffs, CP nodes and skill bars are reset) so builds never bleed into each other.
- Calls are synchronous. No claim is made about concurrent/parallel safety beyond what the engine itself provides.

## Limitations

Known limitations (confirmed in code):

- Results follow the vendored engine + game data versions — stale data means stale formulas.
- Browser-born design: global state, singleton init, sync execution.
- Large datasets live in memory after init; init has a one-time cost, subsequent builds are cheap.
- Node.js >= 24 required; bundlers/serverless must explicitly include `vendor/**` (see [Troubleshooting](/troubleshooting)).

## Updating UESP data and engine

```text
UESP upstream
    ↓
update vendored engine/data
    ↓
generate data (npm run generate-data)
    ↓
run tests (npm test)
    ↓
publish
```

1. Merge upstream into `vendor/uesp-esochardata/` (and `vendor/uesp-esolog/` for skill descriptions).
2. Regenerate `vendor/uesp-data/uesp-game-data.json`: `npm run generate-data -- --db /path/to/local.db --version <patch>`.
3. Run `npm test` — golden values are locked to the vendored formulas; intentional upstream changes require updating expectations.
4. See [Contributing](/contributing) for the full patch-update procedure.
