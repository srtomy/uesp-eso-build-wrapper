---
title: Buffs & Toggle Skills
---

# Buffs & Toggle Skills

## Named buffs

Pass the **exact names** from the UESP buff catalog via `activeBuffs`:

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  activeBuffs: ['Major Prophecy', 'Minor Slayer', 'Major Sorcery'],
});
```

### Discovering buff names

Never hardcode a buff name from memory — use the catalog function and filter by group:

```ts
import { listAvailableBuffs } from 'uesp-eso-build-wrapper';

const majors = listAvailableBuffs('Major');
// [{ name: 'Major Prophecy', effects: [{ statId: 'SpellCrit', value: 2191, display: '' }], ... }]

const groups = new Set(listAvailableBuffs().map((b) => b.group));
// "Major" | "Minor" | "Set" | "Target" | "Skill" | "Potion" | "Poison" | "Cyrodiil" | "Other"
```

Each [BuffInfo](/api/interfaces/BuffInfo) tells you the buff's group, its icon and which stats it affects — useful for rendering buff pickers in your own UI.

## Toggle skills

Toggle skills are the UESP Build Editor's toggle tab (Emperor, Alliance War ranks, AvA toggles, ...). Enable them by name:

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  toggleSkills: ['Emperor', 'Authority', 'Domination', 'Tactician'],
});
```

Two caveats, surfaced by [listAvailableToggleSkills()](/api/functions/listAvailableToggleSkills):

- `requiresCyrodiil: true` toggles only apply when `character.cyrodiil` is also `true`.
- `isPassive: true` toggles are backed by a passive skill and need that skill unlocked via `passiveSkills`/`skillBars` for the engine to match the description.

## Toggled set bonuses (advanced)

Some set effects are themselves toggleable in the UESP editor (e.g. Ansuul's Torment's conditional damage). These use rule keys exported by [`scripts/browser-export-build.js`](https://github.com/srtomy/uesp-eso-build-wrapper#validating-against-the-uesp-browser):

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  toggledSetBonuses: ["Ansuul's Torment"],
});
```

### Stacking toggles

Some toggles stack up to a maximum (e.g. Sergeant's Mail, Rallying Cry). They have a number input in the UESP editor; here the count comes from `toggledSetBonusCounts`:

```ts
calculateBuild({
  ...input,
  toggledSetBonuses: ["Sergeant's Mail"],
  toggledSetBonusCounts: { "Sergeant's Mail": 4 },
});
```

The count defaults to `0`, which makes a stacking toggle contribute nothing — the same as the UESP editor, whose number input starts at 0. `stats.setToggles` exposes each applicable toggle's `minTimes`/`maxTimes`/`count` so a UI can render the input, and the value is clamped to that range.

::: warning
`activeBuffs`, `toggleSkills`, `toggledSetBonuses` and `toggledSetBonusCounts` accept only **exact** names/keys. A typo silently enables nothing. Build your name lists from the catalog functions instead of hardcoding.
:::
