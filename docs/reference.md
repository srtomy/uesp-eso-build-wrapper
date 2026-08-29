# Reference

Detail that's only needed for specific tasks (patch updates, catalog/buff work, debugging divergences). See `AGENTS.md` / `CLAUDE.md` for the always-relevant architecture overview.

## Updating formulas after an ESO patch

1. In `vendor/uesp-esochardata/`, run: `git fetch upstream && git merge upstream/master`
2. Download the latest UESP SQL dumps and seed `local.db` (see `eso-build-editor/scripts/seed.ts`)
3. Run: `npm run generate-data -- --db /path/to/local.db --version <patch>`
4. Commit `vendor/uesp-data/uesp-game-data.json`
5. If `STATS_UNIQUE_LIST`, `STATS_BASE_LIST`, or `STATS_TYPE_LIST` changed in `editBuild.class.php`, update `src/lib/eso-engine/input-stats.ts`
6. Run `npm run build && npm test` — update any golden values that changed intentionally

## Supported features

`uesp-game-data.json` contains all the rule categories used at runtime:

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

## Catalog functions

| Function | Returns | Notes |
|---|---|---|
| `listAvailableBuffs(group?)` | `BuffInfo[]` | 164 buffs; group = "Major"\|"Minor"\|"Set"\|"Target"\|… |
| `listRacialPassives(race)` | `PassiveSkillInfo[]` | todos os ranks por raça |
| `listClassPassives(class)` | `PassiveSkillInfo[]` | todos os ranks por classe (3 skill lines) |
| `listAvailableToggleSkills()` | `ToggleSkillInfo[]` | 101 toggles; `requiresCyrodiil` indica os PvP |

## Known limitations

- **`esoskills.js` requer submodule** — `GetEsoSkillDescription` vive em `vendor/uesp-esolog/resources/esoskills.js`. Sem ele, skill passivos/ativos não geram stats (mas o motor não crasha). Adicione com: `git submodule add git@github.com:uesp/uesp-esolog.git vendor/uesp-esolog`
- **`g_SkillsData` pode estar desatualizado** — alguns passivos raciais (ex: Highborn do High Elf) têm descrição antiga (ganho de XP) no JSON atual; a regra de SpellCrit não bate. Re-gere o JSON após baixar os dumps do patch mais recente.
- **Toggle skills Cyrodiil** (Emperor, Authority, Domination, Tactician, Combat Medic, Continuous Attack) — requerem `character.cyrodiil: true` + o passivo na lista `passiveSkills` (`listAvailableToggleSkills()` mostra `requiresCyrodiil: true`).
- **`passiveSkills` com dependência de barra** — passivos como Pressure Points (NB) multiplicam por skills na barra; sem `skillBars`, o delta é 0.
- **Dados de descrição de skill** — se `g_SkillsData[abilityId].description` não bater com nenhum regex em `buildRules.passive`, o passivo não gera stats. Use `GetEsoSkillDescription(id)` no Node para depurar.
- **BashDamage pode divergir ~9 pontos do UESP** — rule 38574 aplica -1% por peça de Light Armor (habilidade 152778). Divergência causada por versões distintas de `g_SkillsData` entre `esobuilds.uesp.net` e a wiki; re-gere o JSON a partir dos dumps corretos.
