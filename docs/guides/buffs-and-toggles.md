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

::: warning
`activeBuffs`, `toggleSkills` and `toggledSetBonuses` accept only **exact** names/keys. A typo silently enables nothing. Build your name lists from the catalog functions instead of hardcoding.
:::
