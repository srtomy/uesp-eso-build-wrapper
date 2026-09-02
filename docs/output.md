---
title: Reading the Output
---

# Reading the Output

`calculateBuild()` returns a [ComputedStats](/api/interfaces/ComputedStats) object.

```ts
const stats = calculateBuild({ character: { /* ... */ } });
```

## Named stats

The most-used stats are typed properties:

| Property | Description |
| --- | --- |
| `Health` / `Magicka` / `Stamina` | Maximum resource pools |
| `HealthRegen` / `MagickaRegen` / `StaminaRegen` | Regeneration |
| `WeaponDamage` / `SpellDamage` | Base damage |
| `WeaponCrit` / `SpellCrit` | Critical chance |
| `SpellCritDamage` / `WeaponCritDamage` | Critical damage bonus |
| `PhysicalResist` / `SpellResist` / `CritResist` | Resistances |
| `PhysicalPenetration` / `SpellPenetration` | Armor penetration |
| `DefensePhysicalMitigation` / `DefenseSpellMitigation` | Effective mitigation vs. enemy attacks |
| `EffectivePower` / `EffectiveSpellPower` / `EffectiveWeaponPower` | Effective power |
| `HealingDone` / `HealingTaken` | Healing modifiers |
| `RunSpeed` / `SprintSpeed` | Movement speed |

Percent-style stats come out in percent units as the engine displays them (e.g. `12.5` = 12.5%).

## All 221 stats: `stats.raw`

`raw` is the complete `g_EsoComputedStats` record from the engine — every stat the UESP build editor shows, including the less common ones (BashDamage, GroupHealing, ...):

```ts
for (const [statId, value] of Object.entries(stats.raw)) {
  console.log(statId, value);
}
```

::: tip
Stat IDs are stable — they are the engine's own `g_EsoComputedStats` keys (UESP version 49+). If you need a stat not in the named list, access it via `stats.raw.<StatId>`.
:::

## Debugging a discrepancy

When a stat doesn't match what you expect, [debugBuild()](/api/functions/debugBuild) returns the full picture: every input value per category (item, set, buff, CP, mundus, food, skill) and **which source contributed each value**:

```ts
import { debugBuild } from 'uesp-eso-build-wrapper';

const info = debugBuild(input);
console.log(info.inputValues.Set);     // what each set bonus contributed
console.log(info.statSources.SpellDamage); // who set SpellDamage, in order
```

It runs the same calculation — use it in tests or local debugging, not in production paths.
