# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
