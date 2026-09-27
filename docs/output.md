---
title: Reading the Output
---

# Reading the Output

`calculateBuild()` returns a [`CalculatedBuild`](/api/interfaces/CalculatedBuild) object — the computed stats plus `setToggles`.

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

## All 204 stats: `stats.raw`

`raw` is the complete `g_EsoComputedStats` record from the engine — every stat the UESP build editor shows, including the less common ones (BashDamage, GroupHealing, ...):

```ts
for (const [statId, value] of Object.entries(stats.raw)) {
  console.log(statId, value);
}
```

::: tip
Stat IDs are stable — they are the engine's own `g_EsoComputedStats` keys (UESP version 49+). If you need a stat not in the named list, access it via `stats.raw.<StatId>`.
:::

## Applicable set toggles: `stats.setToggles`

Some set bonuses are conditional in a way the engine cannot infer (e.g. "after interrupting an enemy", "out of combat"). The UESP Build Editor exposes them as manual checkboxes. `calculateBuild()` reports which of them apply to the current build:

```ts
const { setToggles } = calculateBuild(input);

setToggles;
// [
//   { id: "Ansuul's Torment",                setId: "Ansuul's Torment", label: "Ansuul's Torment" },
//   { id: "Ansuul's Torment (Bonus Damage)", setId: "Ansuul's Torment", label: "Ansuul's Torment (Bonus Damage)" },
// ]
```

This is the list of **applicable** toggles (the set is equipped with enough pieces and any rule requirement is met) — not the enabled ones. To enable one, pass its `id` in [`BuildInput.toggledSetBonuses`](/api/interfaces/BuildInput):

```ts
calculateBuild({
  ...input,
  toggledSetBonuses: ["Ansuul's Torment"],
});
```

Empty when the build equips no set with a conditional toggle.

Stacking toggles (e.g. Sergeant's Mail) only contribute when a count is given via [`BuildInput.toggledSetBonusCounts`](/api/interfaces/BuildInput); each `SetToggle` exposes `minTimes`/`maxTimes`/`count`. See [Buffs & Toggle Skills](/guides/buffs-and-toggles).

## Debugging a discrepancy

When a stat doesn't match what you expect, [debugBuild()](/api/functions/debugBuild) returns the full picture: every input value per category (item, set, buff, CP, mundus, food, skill) and **which source contributed each value**:

```ts
import { debugBuild } from 'uesp-eso-build-wrapper';

const info = debugBuild(input);
console.log(info.inputValues.Set);     // what each set bonus contributed
console.log(info.statSources.SpellDamage); // who set SpellDamage, in order
```

It runs the same calculation — use it in tests or local debugging, not in production paths.
