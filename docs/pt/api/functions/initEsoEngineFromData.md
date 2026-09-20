[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / initEsoEngineFromData

# Function: initEsoEngineFromData()

> **initEsoEngineFromData**(`options`): `void`

Initializes the UESP math engine from a pre-parsed `UespInitData` object.

**Must be called once** before `calculateBuild()` or `debugBuild()`.
Subsequent calls are no-ops — the engine loads exactly once per process.

Use this when the game data comes from a file, database or external source
instead of the package's vendored JSON. The vendor scripts path is resolved
internally from the package installation.

## Parameters

### options

[`EsoEngineFromDataOptions`](../interfaces/EsoEngineFromDataOptions.md)

[EsoEngineFromDataOptions](../interfaces/EsoEngineFromDataOptions.md) with the parsed game data.

## Returns

`void`

## Throws

If the vendor UESP scripts cannot be read from the package.

## Example

```ts
import fs from 'fs';
import { initEsoEngineFromData } from 'uesp-eso-build-wrapper';
import type { UespInitData } from 'uesp-eso-build-wrapper';

const initData = JSON.parse(fs.readFileSync('uesp-game-data.json', 'utf-8')) as UespInitData;
initEsoEngineFromData({ initData });
```
