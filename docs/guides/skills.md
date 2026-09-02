---
title: Skills & Passives
---

# Skills & Passives

## Skill bars

Slotted skills matter even though this library computes stats, not damage rotations: the engine uses the active bar to decide **conditional effects** — skill-line passives (e.g. Destruction Staff passives only apply with a staff skill slotted) and conditional set bonuses.

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  skillBars: {
    bar1: [
      { skillId: 28807, morphIndex: 2 }, // Crystal Fragments (second morph)
      { skillId: 24322 },                // Mages' Fury (no morph)
    ],
    bar2: [
      { skillId: 29073, morphIndex: 1 }, // Boundless Storm (first morph)
    ],
  },
  activeWeaponBar: 1, // default — which bar is active
});
```

Each [SkillSlot](/api/interfaces/SkillSlot) takes:

| Field | Description |
| --- | --- |
| `skillId` | Base (unmorphed) skill ID — the engine's lookup key. |
| `morphSkillId` | Optional ability ID of the equipped morph; used to resolve the correct description text. |
| `morphIndex` | `0` base (default), `1` first morph, `2` second morph. |

Up to 6 skills per bar. `activeWeaponBar` also selects which weapon items (`MainHand1/OffHand1` vs `MainHand2/OffHand2`) count for enchants and set bonuses.

## Passives

Passives are unlocked by **ability ID**. The catalog functions give you the IDs — each passive appears once per rank, so pick the rank you want (usually the last):

```ts
import {
  listRacialPassives,      // race passives, e.g. listRacialPassives('High Elf')
  listClassPassives,       // class passives (3 skill lines)
  listPassivesBySkillLine, // any line: 'Heavy Armor', 'Undaunted', 'Destruction Staff', ...
  listAvailableSkillLines, // all valid skill line names
} from 'uesp-eso-build-wrapper';

const passiveIds = [
  ...listRacialPassives('High Elf'),
  ...listClassPassives('Sorcerer'),
  ...listPassivesBySkillLine('Light Armor'),
  ...listPassivesBySkillLine('Undaunted'),
].map((p) => p.abilityId);

const stats = calculateBuild({
  character: { /* ... */ },
  passiveSkills: passiveIds,
});
```

Each passive's effect is applied by the engine by matching its description text — the same mechanism the UESP editor uses.

## Auto racial passives

`autoPassives: true` mirrors the UESP "Auto Purchase Racial Passives" checkbox: it injects the **highest-rank passives for the selected race** automatically.

```ts
const stats = calculateBuild({
  character: { race: 'High Elf', /* ... */ },
  autoPassives: true,
});
```

It only covers **racial** passives — class and skill-line passives must be passed explicitly via `passiveSkills`.
