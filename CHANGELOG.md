# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete CI merge-gate pipeline: parallel jobs (lint, typecheck, test, build, package validation, security audit), coverage summary in the CI job summary, PR title enforcement (Conventional Commits), CodeQL, Dependabot, SonarCloud
- `typecheck`, `publint` and `attw` npm scripts; branch protection on `main` with required status checks
- `test:esm` smoke test: packs the tarball, installs it into a clean project and exercises `uesp-eso-build-wrapper` from both ESM (`import`) and CJS (`require(esm)`), initializing the engine with the vendored game data

### Changed
- **Node.js requirement bumped to >= 24 (latest LTS)** — Node 20 reached EOL in 2026-04; CI now tests Node 24.x only
- **ESM-only package** — `"type": "module"`, single tsc build emitting real ESM (`module: nodenext`), `exports["."]` reduced to `{ types, default }`; sources use `import.meta.dirname` and explicit `.js` extensions on relative imports. CJS consumers on supported Node versions keep working via `require(esm)`; on older runtimes use `await import()`
- attw: the `cjs-only-exports-default` workaround is gone; `cjs-resolves-to-esm` is ignored instead (attw models Node 16 semantics, `engines >= 24` resolves `require(esm)` natively)
- Dev scripts run through `tsx` instead of ts-node (CJS-only and unmaintained)
- CI hardening: `npm ci --ignore-scripts`, lockfile-pinned package-validation binaries, third-party actions pinned by commit SHA

## [0.3.0] — 2026-08-29

### Added
- Per-node `isUnlocked` for Champion Points — unlock individual CP stars instead of whole nodes
- `toggledSetBonuses` input: toggle-keyed set bonuses (e.g. Ansuul's Torment)
- `debugBuild()`: diagnostic snapshot of engine state without re-running
- `docs/ENGINE-QUIRKS.md` — catalog of known UESP engine quirks and calculation divergences
- Framework Integration guide and improved vendor-not-found error message
- `SECURITY.md` — security policy and trust-boundary documentation
- GitHub issue templates (bug report, feature request) and PR template
- Golden build fixtures for ESO v50 (5× High Elf Sorcerer, Khajiit Nightblade, Dark Elf Arcanist) with `.disabled.json` skip suffix support
- `tsconfig.build.json` — dedicated emit config; `tsconfig.json` is now the broad editor config (fixes TS6059 for `tests/` files)
- CI matrix now includes Node 20.x alongside 22.x
- `test:coverage` script (uses `@vitest/coverage-v8`, already a devDependency)

### Changed
- ESO patch 50 data (`uesp-game-data.json` regenerated)
- Browser exporter bumped to v1.2.0 (filename prompt, per-node `isUnlocked`, toggled set bonuses)
- Calculator perf: consolidated global state resets and cached stat objects

### Fixed
- Computed stats preserve JSON order — fixes `BashDamage` mapping divergence
- TS6059 error in editors for files under `tests/` and `scripts/` (tsconfig restructure)
- Type error in `scripts/generate-data.ts` (`reduce<number>`)
- `autoPassives` JSDoc incorrectly claimed class passives were injected; it mirrors the UESP "Auto Purchase Racial Passives" checkbox (racial only)

### Removed
- **BREAKING**: `initEsoEngine()` (deprecated since 0.2.0) — use `initEsoEngineFromData({ initData })` instead; `uesp-init-data.json` no longer exists

## [0.2.0] — 2026-06-06

### Added
- `initEsoEngineFromData()` — init from pre-parsed `UespInitData` object (avoids FS reads at runtime)
- `autoPassives` option: auto-inject racial passives at highest rank
- `enchantOverrides`: per-slot custom enchant glyphs
- `skillBars.bar2` + `activeWeaponBar` support
- Full CP node support via `championPointNodes`

### Fixed
- `SneakCost`, `SprintCost`, `RollDodgeCost` overcalculated: removed monkey-patch on
  `RemoveEsoDescriptionFormats` that collapsed `\n\n → " "` before `ComputeEsoInputSkillValue`
  could process it (broke Medium Armor passive regexes)

### Changed
- `initEsoEngine()` (path-based) deprecated in favour of `initEsoEngineFromData()`

## [0.1.0] — 2026-05-01

### Added
- Initial release
- `calculateBuild()` wrapping the UESP engine via `vm.runInThisContext`
- `listAvailableBuffs()`, `listRacialPassives()`, `listClassPassives()`,
  `listPassivesBySkillLine()`, `listAvailableSkillLines()`, `listAvailableToggleSkills()`
- `browser-export-build.js` DevTools exporter
- Golden build-fixture test suite (`build-fixtures.test.ts`)
- Zero runtime dependencies

[0.3.0]: https://github.com/srtomy/uesp-eso-build-wrapper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/srtomy/uesp-eso-build-wrapper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/srtomy/uesp-eso-build-wrapper/releases/tag/v0.1.0
