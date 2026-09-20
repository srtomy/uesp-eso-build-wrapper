[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / debugBuild

# Function: debugBuild()

> **debugBuild**(`input`): [`BuildDebugInfo`](../interfaces/BuildDebugInfo.md)

Runs calculateBuild and returns detailed diagnostic information about the engine state.
Useful for debugging discrepancies between expected and computed stats.

Captures:
- `computedStats`: all computed stat values (same as `result.raw`)
- `inputValues`: per-category input values used during computation (non-zero only,
  except SkillBonus/SkillLine which are always included for easier inspection)
- `cpNodes`: CP node state (name, points, isUnlocked)
- `statSources`: per-stat source log — which passive/CP/buff set each value;
  useful for tracing where an unexpected value comes from

Why the monkey-patch on GetEsoInputValues:
Calling GetEsoInputValues() a second time after calculateBuild() gives incorrect
results because g_EsoComputedStats already holds the first round's values, and some
passive rules read them indirectly. The patch captures the exact inputValues used
in the calculation, without re-running it.

Must be called after initEsoEngineFromData().

## Parameters

### input

[`BuildInput`](../interfaces/BuildInput.md)

## Returns

[`BuildDebugInfo`](../interfaces/BuildDebugInfo.md)
