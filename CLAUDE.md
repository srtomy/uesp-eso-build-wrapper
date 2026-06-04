# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # compile TypeScript → dist/
npm test               # run all tests (Vitest)
npm run test:explore   # run scripts/test-engine.ts interactively via ts-node
```

Run a single test file:

```bash
npx vitest run tests/engine.test.ts
```

Run tests matching a pattern:

```bash
npx vitest run --reporter=verbose -t "baseline"
```

## Core principle

**Never implement game formulas.** All stat calculations (Health, Magicka, resistances, crit, mitigation, etc.) are the exclusive responsibility of the UESP engine (`esoEditBuild.js`). This wrapper's only job is to inject inputs into that engine and read back its outputs. If a stat value seems wrong, the fix is always in the data fed to the engine — never in adding math to the wrapper code.

## Architecture

This is a **Node.js wrapper around the UESP ESO Build Editor math engine** — a browser-side JavaScript engine that calculates Elder Scrolls Online character stats. The central challenge is that the UESP scripts were written for a browser (they assume `window.*` globals, jQuery, and a DOM) and must be adapted to run in Node.js.

### How it works

1. **`loader.ts` — Engine bootstrap**: loads the UESP scripts via `vm.runInThisContext` (not `require()`), which executes them in Node's real global scope so that all `window.*` / `global.*` assignments become accessible cross-module. Before loading, it pre-injects all `g_Eso*` globals and seeds them from `uesp-init-data.json` (the formula/rules data extracted from the browser).

2. **`env-setup.ts` — DOM mock**: provides a minimal fake DOM (element registry + jQuery-like `$.fn` stubs) so the UESP engine can call `$("#esotbRace").val()`, `.prop()`, `.attr()`, etc., without crashing. Character inputs are written here as string values.

3. **`calculator.ts` — Build execution**: the public `calculateBuild()` function:
   - Writes character fields into the mock DOM elements (`setDomValue`)
   - Injects item data directly into `g_EsoBuildItemData[slot]` (bypassing jQuery item parsing)
   - Injects CP2 nodes into `g_EsoCpData[nodeId]` (new path) or mock DOM (legacy path)
   - Enables active buffs in `g_EsoBuildBuffData` and toggle skills in `g_EsoBuildToggledSkillData`
   - Calls `UpdateEsoComputedStatsList_Real(null, true)` — the UESP calculation entry point
   - Reads results from `g_EsoComputedStats[statId].value`

4. **`index.ts` — Public API**: exports `initEsoEngine()` (singleton, must be called once) and `calculateBuild()`.

### Vendor data

- `vendor/uesp-esochardata/` — git submodule of the UESP PHP/JS repo; only `resources/esoEditBuild.js` and `resources/esobuilddata.js` are used at runtime.
- `vendor/uesp-data/uesp-init-data.json` — game formula data extracted from the live UESP website via `browser-extract.js`. Contains `computedStats`, `inputStats`, `buildRules`, `cpData`, `cpSkillsData`, `cpSkillDescData`, etc.

### Tests

All tests live in `tests/`. Each test file calls `initEsoEngine()` in `beforeAll()`. Tests run in a **single fork** (`pool: 'forks', singleFork: true`) because the UESP engine pollutes `process.globals` and is not concurrency-safe.

Golden values in `engine.test.ts` are locked to the vendored UESP formulas. If a vendor update changes them intentionally, update the expected values in the tests.

### Updating formulas after an ESO patch

1. In `vendor/uesp-esochardata/`, run: `git fetch upstream && git merge upstream/master`
2. Open `https://esobuilds.uesp.net` in a browser
3. Run `vendor/uesp-data/browser-extract.js` in the DevTools Console
4. Save the downloaded JSON to `vendor/uesp-data/uesp-init-data.json`
5. Run `npm test` — update any golden values that changed intentionally

### Supported features

`uesp-init-data.json` contains all the rule categories used at runtime:

| Feature                | Status               | How to use                                                                                |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Armor enchants         | ✓ works              | `items[slot].enchantDesc`                                                                 |
| Weapon enchants        | ✓ works              | `items[slot].enchantDesc`                                                                 |
| **Set bonuses**        | ✓ works              | `items[slot].setName + setBonusDesc1..5` — engine calls `UpdateEsoItemSets` automatically |
| **Food / drink buffs** | ✓ works              | `items.Food = { itemId, type: '4', abilityDesc: '...' }`                                  |
| CP nodes               | ✓ works              | `championPointNodes` with `points` or `description`                                       |
| Mundus Stone           | ✓ works              | `character.mundusStone`                                                                   |
| Active buffs (toggle)  | ✓ works              | `activeBuffs: ['Minor Slayer', ...]` + `listAvailableBuffs(group?)`                       |
| Named buff catalog     | ✓ works              | `listAvailableBuffs('Major')` — 164 buffs em grupos Major/Minor/Set/Target/…              |
| Racial passives        | ✓ works              | `autoPassives: true` ou `passiveSkills` + `listRacialPassives(race)`                      |
| Class passives         | ✓ works              | `autoPassives: true` ou `passiveSkills` + `listClassPassives(class)`                      |
| Toggle skills          | ✓ works (infra)      | `toggleSkills: ['War Horn', ...]` + `listAvailableToggleSkills()`                         |

### Catalog functions

| Function | Returns | Notes |
|---|---|---|
| `listAvailableBuffs(group?)` | `BuffInfo[]` | 164 buffs; group = "Major"\|"Minor"\|"Set"\|"Target"\|… |
| `listRacialPassives(race)` | `PassiveSkillInfo[]` | todos os ranks por raça |
| `listClassPassives(class)` | `PassiveSkillInfo[]` | todos os ranks por classe (3 skill lines) |
| `listAvailableToggleSkills()` | `ToggleSkillInfo[]` | 101 toggles; `requiresCyrodiil` indica os PvP |

### Known limitations

- **`esoskills.js` requer submodule** — `GetEsoSkillDescription` vive em `vendor/uesp-esolog/resources/esoskills.js`. Sem ele, skill passivos/ativos não geram stats (mas o motor não crasha). Adicione com: `git submodule add git@github.com:uesp/uesp-esolog.git vendor/uesp-esolog`
- **`g_SkillsData` pode estar desatualizado** — alguns passivos raciais (ex: Highborn do High Elf) têm descrição antiga (ganho de XP) no JSON atual; a regra de SpellCrit não bate. Re-extraia o JSON após o patch mais recente.
- **Toggle skills Cyrodiil** (Emperor, Authority, Domination, Tactician, Combat Medic, Continuous Attack) — requerem `character.cyrodiil: true` + o passivo na lista `passiveSkills` (`listAvailableToggleSkills()` mostra `requiresCyrodiil: true`).
- **`passiveSkills` com dependência de barra** — passivos como Pressure Points (NB) multiplicam por skills na barra; sem `skillBars`, o delta é 0.
- **Dados de descrição de skill** — se `g_SkillsData[abilityId].description` não bater com nenhum regex em `buildRules.passive`, o passivo não gera stats. Use `GetEsoSkillDescription(id)` no Node para depurar.
