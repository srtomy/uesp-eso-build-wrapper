# Project guide for Claude

Context for working on **uesp-eso-build-wrapper** — a Node.js/TypeScript wrapper
around the UESP ESO Build Editor math engine. See [`README.md`](README.md) for the
public API and [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup and the formula-update
process. Personal/local instructions live in `CLAUDE.local.md` (gitignored).

## Core principle

**Never implement game formulas.** All stat math is the exclusive responsibility of
the UESP engine (`esoEditBuild.js`). This wrapper only injects inputs into that engine
and reads outputs back. If a stat looks wrong, the fix is always in the **data fed to
the engine**, never in adding math to wrapper code. See `CONTRIBUTING.md` → "Core principle".

## Stack

- TypeScript 5.9, Node ≥20.12 (CI runs 22.x)
- vitest (tests), eslint 10 + prettier (lint/format), ts-node (scripts)
- **Zero runtime dependencies** — the published package is pure Node.js

## Where things are

```
src/lib/eso-engine/
  loader.ts      — bootstraps UESP scripts into Node's global scope (vm.runInThisContext)
  env-setup.ts   — minimal DOM mock (jQuery stubs, element registry)
  calculator.ts  — calculateBuild() + catalog functions (buffs, passives, toggles)
  debug.ts       — debugBuild(): diagnostic snapshot of engine state
  types.ts       — TypeScript types for all inputs/outputs
  index.ts       — public API exports + init (initEsoEngineFromData)
vendor/
  uesp-esochardata/  — submodule: UESP engine JS (esoEditBuild.js, esobuilddata.js)
  uesp-esolog/       — submodule: UESP skill data (esoskills.js)
  uesp-data/         — extracted formula data (uesp-init-data.json) + browser scripts
tests/
  fixtures/      — golden build exports (*.json); *.disabled.json is skipped
  helpers/       — loadInitData()
scripts/         — generate-data.ts, browser exporters, manual test runners
```

## Tests — which to run for what

| File | Purpose |
|------|---------|
| `engine.test.ts` | Baseline/golden computed stats, item enchants, call isolation, output shape |
| `build-fixtures.test.ts` | Full builds exported from the browser (rename a fixture to `*.disabled.json` to skip it without editing source) |
| `skills.test.ts` | Skill passives/actives via `passiveSkills` / `skillBars` (needs `esoskills.js`) |
| `cp-nodes.test.ts` | Champion Point node name/description resolution |
| `check-cp.test.ts` | CP rule structure smoke tests (`ESO_CPEFFECT_MATCHES`) |
| `arcane-supremacy.test.ts` | CP node → real stat-delta integration |
| `init-engine-with.test.ts` | Engine init API |

## Commands

```bash
npm test                              # all tests (vitest run)
npx vitest run tests/engine.test.ts   # single file
npx vitest run -t "baseline"          # by name pattern
npm run lint                          # eslint src tests
npm run format:check                  # prettier --check
npm run build                         # tsc → dist/
npm run generate-data -- --db <path> --version <patch>   # regenerate uesp-data
```

## Gotchas

- The UESP engine writes to `process` globals and is **not concurrency-safe** →
  vitest runs in a single fork. Don't parallelize engine tests.
- `g_EsoComputedStats` **must preserve JSON insertion order** — the deferred loop in
  `esoEditBuild.js` processes stats in that order. Reordering breaks values like
  BashDamage. See `loader.ts`.
- State resets between `calculateBuild` calls are centralized at the top of
  `calculateBuild` (`calculator.ts`). A fresh browser page starts from value 0; the
  wrapper persists globals across calls, so stale values must be cleared there.
- To debug a wrong stat, use `debugBuild()` (`src/lib/eso-engine/debug.ts`): it returns
  a snapshot of `inputValues`, CP node state and per-stat sources without re-running.
- Updating after an ESO patch: see `CONTRIBUTING.md` → "Updating game formulas".

## Git

Git approval rules and personal preferences are in `CLAUDE.local.md` (not versioned).
