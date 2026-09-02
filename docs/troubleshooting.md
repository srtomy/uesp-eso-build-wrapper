---
title: Troubleshooting
---

# Troubleshooting

## `UpdateEsoComputedStatsList_Real não está disponível` / engine not initialized

`calculateBuild()` was called before `initEsoEngineFromData()`, or the init call failed silently.

```ts
// once, before ANY calculation
initEsoEngineFromData({ initData });
```

The init is a singleton — calling it again is a no-op, so it is safe to call at every request boundary if you want.

## Vendor files not found at runtime (Next.js / serverless)

The engine scripts are loaded at runtime via `fs.readFileSync` from the package's `vendor/` folder. Bundlers and serverless tracers cannot see those dynamic reads — in Next.js you must include them explicitly:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ['uesp-eso-build-wrapper'],
  outputFileTracingIncludes: {
    '/**': ['./node_modules/uesp-eso-build-wrapper/vendor/**'],
  },
};
```

Without this, the engine throws at runtime in Vercel/AWS Lambda even though it works locally.

## A stat value looks wrong

**Do not add math to your code to "fix" it.** All formulas live in the vendored UESP engine; the wrapper only injects inputs. A wrong value almost always means wrong input data:

1. Run [debugBuild()](/api/functions/debugBuild) with the same input and inspect `inputValues` — which category contributed the unexpected value?
2. Check names/spellings: buffs, toggles, races and mundus stones are matched **exactly**; a typo silently does nothing.
3. Check the game data version (`_meta` in `uesp-game-data.json`) — old data means old formulas.
4. Compare against the [UESP Build Editor](https://esobuilds.uesp.net) with the same build. If the editor differs, [open an issue](https://github.com/srtomy/uesp-eso-build-wrapper/issues) with your input.

## CP nodes are not applying

- `character.championPoints` must be **> 0** — nodes are ignored when the total is 0.
- The node must be unlocked: `isUnlocked` defaults to `true`, but explicit `false` excludes it.
- On the legacy path, `currentBonus` must be a number or a `"N%"` string.

## A toggle skill does nothing

- Toggle skills with `requiresCyrodiil: true` only apply when `character.cyrodiil: true` is set.
- Toggle skills with `isPassive: true` need the backing skill unlocked via `passiveSkills` or present on a skill bar.
- Names must match [listAvailableToggleSkills()](/api/functions/listAvailableToggleSkills) exactly.

## Race/class name not recognized

The engine matches names as they appear in the UESP Build Editor (`"High Elf"`, not `"Altmer"`; `"Dragonknight"`, not `"DK"`). Unknown names behave as "none selected". Use [listRacialPassives()](/api/functions/listRacialPassives) as a sanity check — an empty result means the name doesn't match the catalog.

## Concurrency / multiple calculations

`initEsoEngineFromData()` loads the engine **once per process** — every `calculateBuild()` afterwards is stateless (inputs are fully reset between calls). You do not need locks or per-request init; a single global init at startup is the intended pattern.

For test suites, run tests in a single process/fork — the vendored engine writes to Node globals and is not safe for parallel workers.
