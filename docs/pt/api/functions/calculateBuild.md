[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / calculateBuild

# Function: calculateBuild()

> **calculateBuild**(`input`): [`ComputedStats`](../interfaces/ComputedStats.md)

Calculates the Computed Character Statistics for the given build.

Each call starts from a clean engine state (previous items, buffs, CP nodes
and skill bars are reset), so builds never bleed into each other.

## Parameters

### input

[`BuildInput`](../interfaces/BuildInput.md)

The build to calculate: character sheet, items, champion
  point nodes, buffs, toggle skills, skill bars and passives.

## Returns

[`ComputedStats`](../interfaces/ComputedStats.md)

All computed stats — named keys (Health, Magicka, SpellDamage, ...)
  plus `raw` with the full 221-stat `g_EsoComputedStats` record.

## Throws

If the engine has not been initialized with
  `initEsoEngineFromData()` first.

## Example

```ts
import { calculateBuild } from 'uesp-eso-build-wrapper';

const stats = calculateBuild({
  character: { race: 'High Elf', class: 'Sorcerer', level: 50,
               attributes: { health: 0, magicka: 64, stamina: 0 } },
  items: {
    Chest: chestItemFromUespApi,  // object returned by esolog.uesp.net/exportJson.php
  },
});
console.log(stats.Magicka, stats.SpellDamage);
```
