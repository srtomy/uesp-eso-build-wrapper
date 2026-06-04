# uesp-eso-build-wrapper

[![CI](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml)

A Node.js/TypeScript wrapper around the [UESP ESO Build Editor](https://github.com/uesp/uesp-esochardata) math engine.

Calculate Elder Scrolls Online **Computed Character Statistics** — Health, Magicka, Stamina, mitigation, crit chance, regeneration, and 200+ more — using UESP's own formulas. No formula reimplementation. No database.

## Features

- ✅ **100% UESP formulas** — same engine powering [esobuilds.uesp.net](https://esobuilds.uesp.net)
- ✅ **221 computed stats** — all `Computed Character Statistics` from the build editor
- ✅ **Zero runtime dependencies** — pure Node.js
- ✅ **Full TypeScript types** — typed inputs and outputs
- ✅ **Singleton loader** — loads the engine once per process, fast on subsequent calls

## Installation

```bash
npm install uesp-eso-build-wrapper
```

## Quick Start

```ts
import { initEsoEngine, calculateBuild } from 'uesp-eso-build-wrapper';

// Initialize once — resolves bundled vendor files automatically
initEsoEngine();

const stats = calculateBuild({
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
  },
});

console.log(stats.Health);       // 16000
console.log(stats.Magicka);      // 19104
console.log(stats.MagickaRegen); // 514
console.log(stats.SpellDamage);  // 1000
```

## With Equipped Items

Items are passed directly as returned by the [UESP public item API](https://esolog.uesp.net/exportJson.php?table=minedItem&id=70&level=50&quality=5).

```ts
// 1. Fetch item data from UESP API
const res = await fetch(
  'https://esolog.uesp.net/exportJson.php?table=minedItem&id=70&level=50&quality=5'
);
const data = await res.json();
const item = data.minedItem[0]; // pick the variant you want

// 2. Pass it directly — no mapping needed
const stats = calculateBuild({
  character: {
    race: 'Nord',
    class: 'Dragonknight',
    level: 50,
    attributes: { health: 64, magicka: 0, stamina: 0 },
  },
  items: {
    Chest: item,
  },
});

console.log(stats.Health); // includes item enchant + set bonus
```

## API

### `initEsoEngine(resourcesPath?, initDataPath?)`

Initializes the UESP math engine. **Must be called once** before `calculateBuild()`.

Safe to call multiple times — only executes on the first call.

| Param | Type | Default | Description |
|---|---|---|---|
| `resourcesPath` | `string` | bundled vendor | Path to `esoEditBuild.js` and `esobuilddata.js` |
| `initDataPath` | `string` | bundled vendor | Path to `uesp-init-data.json` with game formulas |

### `calculateBuild(input: BuildInput): ComputedStats`

Runs the UESP engine and returns the computed stats.

#### `BuildInput`

```ts
interface BuildInput {
  character: {
    race: string;             // "High Elf" | "Nord" | "Breton" | "Khajiit" | ...
    class: string;            // "Sorcerer" | "Dragonknight" | "Nightblade" | ...
    level: number;            // 1–50
    attributes: {
      health: number;         // attribute points (max 64 total)
      magicka: number;
      stamina: number;
    };
    mundusStone?: string;     // "The Thief" | "The Apprentice" | ...
    cyrodiil?: boolean;       // Battle Spirit (PvP)
    vampireStage?: number;    // 0–4
    werewolfStage?: number;   // 0 or 1
    championPoints?: number;  // 0–3600
    rulesVersion?: string;    // "Live" (default) | "PTS"
  };
  items?: Partial<Record<EquipSlot, UespItemApiData>>;
}
```

#### `EquipSlot`

```
Head | Shoulders | Chest | Hands | Legs | Waist | Feet |
Neck | Ring1 | Ring2 |
MainHand1 | OffHand1 | MainHand2 | OffHand2 |
Poison1 | Poison2 | Food | Potion
```

#### `ComputedStats`

Key stats returned (see [`types.ts`](src/lib/eso-engine/types.ts) for full list):

| Property | Description |
|---|---|
| `Health` / `Magicka` / `Stamina` | Maximum resource pools |
| `HealthRegen` / `MagickaRegen` / `StaminaRegen` | Out-of-combat regeneration |
| `WeaponDamage` / `SpellDamage` | Base damage |
| `WeaponCrit` / `SpellCrit` | Critical chance |
| `PhysicalResist` / `SpellResist` / `CritResist` | Resistances |
| `PhysicalPenetration` / `SpellPenetration` | Armor penetration |
| `DefensePhysicalMitigation` / `DefenseSpellMitigation` | Effective mitigation % |
| `HealingDone` / `HealingTaken` | Healing modifiers |
| `RunSpeed` / `SprintSpeed` | Movement speed |
| `raw` | All 221 stats as `Record<string, number>` |

> All stat IDs match `g_EsoComputedStats` from the UESP engine (version 49+).

## Updating Formulas After a New ESO Patch

When ZeniMax releases a new patch or DLC, the formulas may change. To update:

```bash
# 1. Update the UESP submodule
cd vendor/uesp-esochardata
git fetch upstream && git merge upstream/master
cd ../..

# 2. Re-extract the formulas from the UESP website
#    Open https://esobuilds.uesp.net in a browser
#    Run vendor/uesp-data/browser-extract.js in DevTools Console
#    Save the result to vendor/uesp-data/uesp-init-data.json

# 3. Run tests to verify
npm test
```

## License

MIT © srtomy

This package bundles files from [uesp/uesp-esochardata](https://github.com/uesp/uesp-esochardata) (MIT).
See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for details.

Elder Scrolls Online is a trademark of ZeniMax Media Inc. This project is not affiliated with or endorsed by ZeniMax Media Inc.
