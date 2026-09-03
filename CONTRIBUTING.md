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
- Title follows Conventional Commits (`feat:`, `fix:`, `chore:`, …) — it feeds the CHANGELOG
- CI runs on every PR and is required to merge into `main` — see `docs/CI-PIPELINE.md` for the full pipeline (jobs, coverage, package validation)
- Changelog hygiene:
  - `feat:`, `fix:`, `perf:` and `feat!`/`BREAKING CHANGE` appear in the changelog; `chore:`, `ci:`, `test:`, `docs:` are omitted unless the commit body contains `[release-note]`
  - To exclude a PR from the changelog, add `[skip changelog]` to the PR body or the `skip changelog` label

## Release

Releases are **manual** — you decide when. Two GitHub Actions (both `workflow_dispatch`):

1. **Prepare release:** Actions → `Prepare release` → Run workflow (`version: auto` bumps from Conventional Commits, or `vX.Y.Z` explicit). It runs `scripts/prepare-release.mjs` and opens a PR `release/vX.Y.Z` with `package.json` + `CHANGELOG.md`.
2. **Publish release:** after the release PR is merged to `main`, Actions → `Publish release` → Run workflow (`ref: main`). It creates the git tag, GitHub Release (from `CHANGELOG.md`), and publishes to npm (`--provenance`, gated by `vars.NPM_PUBLISH_ENABLED` + `secrets.NPM_TOKEN`).

Local alternative (without Actions): `node scripts/prepare-release.mjs auto --dry-run` to preview, then `node scripts/prepare-release.mjs auto` + `git commit -m "chore: release vX.Y.Z"` + `gh pr create`.

See `docs/CI-PIPELINE.md §8` for the full design and `scripts/prepare-release.mjs` for the filter implementation. Internal release tracking details are not part of the public contributor flow.
