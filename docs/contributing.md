---
title: Contributing
---

# Contributing

This guide covers developing the library itself. For consumer docs, start at [Introduction](/).

## Development setup

```bash
git clone --recurse-submodules https://github.com/srtomy/uesp-eso-build-wrapper.git
cd uesp-eso-build-wrapper
npm install
npm test
```

If you cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Running tests

```bash
npm test                                   # all tests
npx vitest run tests/engine.test.ts        # single file
npx vitest run --reporter=verbose -t "baseline"  # by name pattern
```

Tests run in a **single fork** (`singleFork: true`): the UESP engine writes to `process` globals and is not concurrency-safe.

## Core principle

**Never implement game formulas.** All stat calculations are the exclusive responsibility of the vendored UESP engine (`esoEditBuild.js`). The wrapper's only job is to inject inputs into that engine and read back outputs. If a stat value seems wrong, the fix is always in the data fed to the engine — never in wrapper math.

## Updating after a new ESO patch

Two sources change with each patch:

**1. Engine scripts** (`vendor/uesp-esochardata/` submodule):

```bash
cd vendor/uesp-esochardata
git fetch upstream && git merge upstream/master
cd ../..
```

**2. Game data** (`vendor/uesp-data/uesp-game-data.json`):

```bash
# seed local.db from UESP SQL dumps first (see eso-build-editor's db:seed)
npm run generate-data -- --db /path/to/local.db --version <patch>
```

Then:

1. Commit the updated game data (including the `_meta` patch marker)
2. Run `npm test`
3. Update golden values in `tests/engine.test.ts` if they changed **intentionally** (formula patch)

## Validating against the UESP browser

`scripts/browser-export-build.js` runs inside the UESP Build Editor DevTools console and exports the full build — inputs and expected stats — as JSON.

1. Open [esobuilds.uesp.net](https://esobuilds.uesp.net), configure your build
2. DevTools (F12) → Console → paste and run the script
3. A `uesp-build-export.json` file downloads
4. Inspect with `npm run test:build path/to/uesp-build-export.json`
5. Or drop it into `tests/fixtures/` — `tests/build-fixtures.test.ts` auto-discovers it and asserts every `expectedStats` value

## Pull requests

- One feature or fix per PR
- All tests, lint and format must pass — CI is required to merge (see `docs/CI-PIPELINE.md`)
- Add or update tests for any behavior change
- Titles follow Conventional Commits (`feat:`, `fix:`, `chore:` …)
