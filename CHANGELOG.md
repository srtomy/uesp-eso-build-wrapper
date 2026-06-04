# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta-1] - 2026-06-03

### Added

- Champion Points metadata and dynamic description resolution for CP nodes
- Full test suite: regeneration, armor, critical, Mundus Stone, effective power, full 12-item build
- Vitest testing framework configuration (single-fork, serial execution required by the UESP global engine)
- ESLint and Prettier configuration

### Fixed

- Armor enchantment build rules added to `uesp-init-data.json`

## [0.1.0] - initial release

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
