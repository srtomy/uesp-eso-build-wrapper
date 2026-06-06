# Contributing

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
npm test                          # all tests
npx vitest run tests/engine.test.ts        # single file
npx vitest run --reporter=verbose -t "baseline"  # by name pattern
```

Tests run in a **single fork** (`singleFork: true`) because the UESP engine writes to `process` globals and is not concurrency-safe.

## Updating game formulas after an ESO patch

The UESP engine scripts and formula data come from two sources:

**1. Engine scripts** (`vendor/uesp-esochardata/`):

```bash
cd vendor/uesp-esochardata
git fetch origin && git merge origin/master
cd ../..
```

**2. Formula data** (`vendor/uesp-data/uesp-init-data.json`):

1. Open `https://en.uesp.net/wiki/Special:EsoBuildEditor` in Chrome/Firefox
2. Wait for the page to fully load
3. Open DevTools (F12) → Console tab
4. Paste the contents of `vendor/uesp-data/browser-extract.js` and press Enter
5. A JSON file will download — save it as `vendor/uesp-data/uesp-init-data.json`

> **Important:** use the same URL (`Special:EsoBuildEditor`) for both `browser-extract.js` and `browser-export-build.js`. Different UESP deployments carry different `g_SkillsData` versions and will produce divergent results.

After updating either source, run `npm test`. Update golden values in `tests/engine.test.ts` if they changed intentionally (formula patch).

## Core principle

**Never implement game formulas.** All stat calculations are the exclusive responsibility of the UESP engine (`esoEditBuild.js`). This wrapper's only job is to inject inputs into that engine and read back outputs. If a stat value seems wrong, the fix is always in the data fed to the engine — never in adding math to wrapper code.

## Project structure

```
src/lib/eso-engine/
  loader.ts       — bootstraps UESP scripts into Node's global scope
  env-setup.ts    — minimal DOM mock (jQuery stubs, element registry)
  calculator.ts   — calculateBuild() + catalog functions
  index.ts        — public API exports
  types.ts        — TypeScript types for all inputs and outputs

vendor/
  uesp-esochardata/   — git submodule: UESP engine JS (esoEditBuild.js, esobuilddata.js)
  uesp-esolog/        — git submodule: UESP skill data (esoskills.js)
  uesp-data/
    uesp-init-data.json   — extracted game formulas (see "Updating" above)
    browser-extract.js    — DevTools script to extract init data
```

## Pull requests

- One feature or fix per PR
- All tests must pass (`npm test`)
- Lint and format must pass (`npm run lint && npm run format:check`)
- Add or update tests for any behaviour change
- Update CHANGELOG.md under `[Unreleased]`
