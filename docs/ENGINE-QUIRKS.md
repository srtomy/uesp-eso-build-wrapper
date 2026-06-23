# UESP Engine Quirks & Calculation Divergences

Known bugs, quirks, and non-obvious behaviors of the UESP engine as seen through this
wrapper. Start here before debugging a wrong stat.

---

## 1. Deferred-loop ordering: BashDamage and Status damage

**Status:** known divergence vs. UESP browser (fixtures affected: sorcerer-3, 4, 6 need re-export)

**Root cause:** `UpdateEsoComputedStatsList_Real` (`esoEditBuild.js:4393`) runs a loop
`j=0..10` that:
1. Merges all stats: `inputValues[name] = g_EsoComputedStats[name].value`
2. Processes each deferred stat **in insertion order** of `g_EsoComputedStats`
3. Updates `inputValues[statId]` inline (`esoEditBuild.js:4649`) as each stat is computed

Consequence: if stat A comes before stat B in `g_EsoComputedStats` and both are deferred
at the same level, A uses B's value from the **previous round's merge**, while B uses A's
**already-updated** value.

**Key indices in `g_EsoComputedStats`:**

| Stat | Index | DB id |
|---|---|---|
| `BashDamage` | 51 | 6781 |
| `DirectDamageDone` (DDD) | 71 | 6801 |
| `StatusFlameSpellDamage` | 95+ | — |
| `HAOverload` | 177 | — |

`DirectDamageDone` has `depends=[""]` in the DB — an artifact of `NULL` stored as a
JSON array with an empty string. The engine treats this as deferred level 0.

**Effects:**
- `BashDamage` (idx 51) < DDD (idx 71): runs before DDD → uses DDD=0 from merge → result is lower than expected on first page load
- Status stats (idx 95+) > DDD (idx 71): run after DDD is already updated inline → use DDD=0.06 → correct
- On the **second engine call** (after any user interaction in the browser): merge sees DDD=0.06 from `g_EsoComputedStats[DDD].value` → BashDamage now uses 0.06 → different result

**Fix attempted and reverted:** treating `depends=[""]` as non-deferred fixed sorcerer-6
but broke sorcerer-1 (whose fixture was captured on first load). The correct fix is to
re-export sorcerer-3/4/6 fixtures from a fresh UESP page load.

**File references:**
- `vendor/uesp-esochardata/resources/esoEditBuild.js:4393` — deferred loop
- `vendor/uesp-esochardata/resources/esoEditBuild.js:4649` — inline inputValues update
- `src/lib/eso-engine/loader.ts` — `g_EsoComputedStats` insertion-order preservation

---

## 2. `RemoveEsoDescriptionFormats` monkey-patch: SneakCost / SprintCost / RollDodgeCost

**Status:** fixed (removed in commit `22b0a0f`, June 2026)

`loader.ts` previously monkey-patched `RemoveEsoDescriptionFormats` to replace `\n → " "`
(single space). This broke Medium Armor passives that use `[\r\n ]{2,}` regex to detect
line endings.

**Why it broke:** `ComputeEsoInputSkillValue` already does `replaceAll("\n", " ")`
internally, so `\n\n → "  "` (two spaces). The regex `[\r\n ]{2,}` matched that. The
patch collapsed `\n\n → " "` (one space) before that internal pass, making `{2,}` fail.

**Stats affected:**

| Stat | Before fix | After fix |
|---|---|---|
| `SneakCost` | 114 (+14) | 100 ✓ |
| `SprintCost` | 408 (+10) | 398 ✓ |
| `RollDodgeCost` | 3716 (+606) | 3110 ✓ |

**Rule of thumb:** if a movement-cost stat diverges, check for any preprocessing of
`\n` before `ComputeEsoInputSkillValue` runs.

---

## 3. LA/HA damage: item contribution lower than UESP (under investigation)

**Status:** under investigation as of 2026-06-18; not yet fixed

**Symptom:** LA/HA damage is consistently lower than UESP by a fixed delta regardless
of passives. Example with Dark Elf Arcanist, CP160, Dual Dagger + 2H:

| Stat | UESP | Wrapper | Diff |
|---|---|---|---|
| `LAOneHand` | 1848 | 809 | −1039 |
| `LADualWield` | 1848 | 809 | −1039 |
| `LAFlameStaff` | 1663 | 728 | −935 |
| `HADualWield` | 2083 | 911 | −1172 |

The delta is fixed (independent of passives), pointing to an item/base path issue.

**Suspected cause:** `SkillBonusWeaponDmg.Physical` or `Skill2.LAWeaponDamage` not
being populated correctly — possibly a set bonus (Spectral Cloak, Nerien'eth) that
affects LA is failing its rule regex.

**Next step:** compare `g_EsoComputedStats['LAPhysicalWeaponDamage']` at runtime against
the UESP browser value for the same build.

---

## 4. Regen excess from passives (under investigation)

**Status:** under investigation as of 2026-06-18; not yet fixed

**Symptom:** with passives enabled, wrapper applies too much regen:

| | Without passives | With passives |
|---|---|---|
| `MagickaRegen` | wrapper −24 vs UESP | wrapper **+108** vs UESP |
| `StaminaRegen` | wrapper −270 vs UESP | wrapper **+203** vs UESP |

Build: Dark Elf Arcanist, CP160.

**Suspected cause:** Arcanist (IDs ~45500–45574) or Dark Elf racial (IDs ~45165–45200)
passive descriptions in `skillsData` still match a regen regex from a previous patch.
In v50 those passives may have changed effect.

**Next step:** pull the passive ability IDs from the build export, look up their
`description` in `uesp-game-data.json`, and compare against what the UESP website
shows for those abilities in v50.

---

## Debugging workflow

```ts
import { debugBuild } from 'uesp-eso-build-wrapper';

const snap = debugBuild(input);
// snap.inputValues       — all inputValues at time of call
// snap.cpNodes           — CP node state
// snap.statSources       — per-stat breakdown
```

See `src/lib/eso-engine/debug.ts` for the full snapshot shape.
