# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-06

### Added

- **Passive skills** — `passiveSkills: [abilityId, ...]` applies any skill passive (armor lines, racial, class, guild, etc.) and scales by piece count where applicable
- **`autoPassives`** — `character.autoPassives: true` applies all racial and class passives automatically for a character
- **`skillBars`** — `skillBars: { bar1, bar2 }` slots active skills onto bars; skills that grant buffs while slotted (e.g. Major Prophecy from Inferno) apply automatically
- **`toggleSkills`** — enables toggled skills (Cyrodiil PvP skills + passive toggles like Aegis of the Unseen)
- **`mundusStone2`** — second Mundus Stone for Twice-Born Star builds
- **`listRacialPassives(race)`** — catalog of all passive skills for a given race (all ranks)
- **`listClassPassives(class)`** — catalog of all passive skills for a given class across all three skill lines
- **`listPassivesBySkillLine(line)`** — catalog of passives for any skill line (Heavy Armor, Undaunted, Fighters Guild, etc.)
- **`listAvailableSkillLines()`** — lists all available skill line names
- **`listAvailableToggleSkills()`** — catalog of all 101 toggle skills with effects and Cyrodiil flag
- **`listAvailableBuffs(group?)`** — catalog of 164 named buffs (Major/Minor/Set/…) filterable by group
- **`activeBuffs`** — `activeBuffs: ['Major Prophecy', ...]` applies named buffs by name
- **Drink buffs** — `items.Food` supports `type: '5'` for drink consumables (Stamina/Health recovery)
- **`vendor/uesp-esolog`** submodule — provides `esoskills.js` for skill description resolution
- **228-test suite** — full coverage of all features including regression tests for the `\n\n` whitespace fix

### Fixed

- **Movement cost passives** (`SneakCost`, `SprintCost`, `RollDodgeCost`) were over-calculated due to a monkey-patch in `loader.ts` (`RemoveEsoDescriptionFormats`) that collapsed `\n\n → " "`, breaking `[\r\n ]{2,}` regex patterns in Medium Armor rules. Patch removed; `ComputeEsoInputSkillValue` already handles `\n` normalization internally.
- **`browser-extract.js`** URL corrected from `esobuilds.uesp.net` to `en.uesp.net/wiki/Special:EsoBuildEditor` to match `browser-export-build.js` and prevent `g_SkillsData` version mismatch
- **`@vitest/coverage-v8`** moved from `dependencies` to `devDependencies`
- **`.gitmodules`** SSH URLs changed to HTTPS for anonymous clone support

## [0.1.0-beta-1] - 2026-06-03

### Added

- Champion Points metadata and dynamic description resolution for CP nodes
- Full test suite: regeneration, armor, critical, Mundus Stone, effective power, full 12-item build
- Vitest testing framework configuration (single-fork, serial execution required by the UESP global engine)
- ESLint and Prettier configuration

### Fixed

- Armor enchantment build rules added to `uesp-init-data.json`

## [0.1.0-alpha] - initial release

### Added

- Node.js/TypeScript wrapper around the UESP ESO Build Editor math engine
- `initEsoEngine()` singleton loader — executes UESP scripts via `vm.runInThisContext`
- `calculateBuild()` — injects character inputs into mock DOM, runs UESP calculations, returns typed stats
- 221 computed character statistics (Health, Magicka, Stamina, resistances, crit, regeneration, etc.)
- Support for equipped items via UESP public item API format
- Champion Points node injection (CP2 system)
- Mundus Stone, active buffs, and food/drink buff support
- Set bonuses resolved automatically by the UESP engine
- Full TypeScript types for inputs and all computed stats
- Zero runtime dependencies
- `vendor/uesp-esochardata` as a git submodule (UESP engine scripts)
- `vendor/uesp-data/uesp-init-data.json` — game formula data extracted from live UESP website
