---
title: Character
---

# Character input

`BuildInput.character` is the only required input. It describes the character sheet as it would be set in the UESP Build Editor.

```ts
const stats = calculateBuild({
  character: {
    race: 'Nord',
    class: 'Dragonknight',
    level: 50,
    attributes: { health: 64, magicka: 0, stamina: 0 },
    mundusStone: 'The Thief',
    championPoints: 160,
    rulesVersion: 'Live',
  },
});
```

## Fields

| Field | Type | Description |
| --- | --- | --- |
| `race` | `string` | Race name, e.g. `"High Elf"`, `"Nord"`, `"Khajiit"`. |
| `class` | `string` | Class name, e.g. `"Sorcerer"`, `"Dragonknight"`, `"Nightblade"`. |
| `level` | `number` | Character level, 1–50. |
| `attributes` | `object` | Attribute points: `health`, `magicka`, `stamina`. Max 64 points each, 64 total (fully in one stat, split, or all 64 in one). |
| `mundusStone` | `string?` | Active Mundus Stone, e.g. `"The Thief"`, `"The Apprentice"`. |
| `mundusStone2` | `string?` | Second Mundus Stone — requires the **Twice-Born Star** set (5 pieces). |
| `cyrodiil` | `boolean?` | Enables **Battle Spirit** (PvP buffs). |
| `vampireStage` | `number?` | Vampirism stage, 0–4. |
| `werewolfStage` | `number?` | Lycanthropy stage, 0 or 1. |
| `championPoints` | `number?` | Total Champion Points, 0–3600. Required for [CP nodes](/guides/champion-points) to apply. |
| `rulesVersion` | `string?` | `"Live"` (default) or `"PTS"`. |

::: tip Names must match the UESP catalog
Race, class and mundus names are matched by the engine exactly as they appear in the UESP Build Editor. Unknown names behave as "none selected" rather than throwing — if a race passive seems missing, check the spelling first.
:::

## Race / class passives

Passives are **not** applied automatically (except with `autoPassives: true` for race — see [Skills & Passives](/guides/skills)). Class and other passives are opt-in via `passiveSkills` or the catalog functions:

```ts
import { listRacialPassives, listClassPassives } from 'uesp-eso-build-wrapper';

const passives = [
  ...listRacialPassives('Nord'),        // abilityId of each rank
  ...listClassPassives('Dragonknight'),
].map((p) => p.abilityId);

const stats = calculateBuild({
  character: { /* ... */ },
  passiveSkills: passives,
});
```

See [Skills & Passives](/guides/skills) for the full picture.
