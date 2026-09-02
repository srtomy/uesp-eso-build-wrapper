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
  except SkillBonus/SkillLine que são sempre incluídos para facilitar inspeção)
- `cpNodes`: estado dos CP nodes (nome, pontos, isUnlocked)
- `statSources`: registro de fontes por stat — qual passivo/CP/buff setou cada valor;
  útil para rastrear de onde vem um valor inesperado

Por que o monkey-patch em GetEsoInputValues:
Chamar GetEsoInputValues() uma segunda vez após calculateBuild() dá resultados
incorretos porque g_EsoComputedStats já tem os valores da primeira rodada, e algumas
regras de passivos os leem indiretamente. O patch captura os inputValues exatos usados
no cálculo, sem re-executá-lo.

Must be called after initEsoEngineFromData().

## Parameters

### input

[`BuildInput`](../interfaces/BuildInput.md)

## Returns

[`BuildDebugInfo`](../interfaces/BuildDebugInfo.md)
