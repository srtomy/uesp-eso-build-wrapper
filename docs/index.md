---
title: Introduction
---

# uesp-eso-build-wrapper

A Node.js/TypeScript wrapper around the [UESP ESO Build Editor](https://github.com/uesp/uesp-esochardata) math engine.

Calculate Elder Scrolls Online **Computed Character Statistics** — Health, Magicka, Stamina, mitigation, crit chance, regeneration and [221 more](/output) — using UESP's own formulas. **No formula reimplementation.**

## Why this library?

The [UESP Build Editor](https://esobuilds.uesp.net) has the most accurate ESO stat calculation available: it is powered by the same `esoEditBuild.js` engine that UESP maintains and keeps up to date with every patch. But that engine is browser-only JavaScript, written against `window` globals, jQuery and the DOM.

This library loads that **vendored, unmodified engine** into Node.js and acts as a bridge:

- **You inject inputs** — character sheet, items (straight from the UESP item API), Champion Points, buffs, skills.
- **UESP's engine computes** every stat with its own formulas.
- **You read back outputs** — one typed object with all computed stats.

The wrapper never implements a single game formula. When a stat looks wrong after a patch, the fix is always in the game *data* fed to the engine — never in wrapper math. That is what makes it stay correct across ESO patches.

## Features

- **100% UESP formulas** — same engine powering [esobuilds.uesp.net](https://esobuilds.uesp.net)
- **221 computed stats** — every Computed Character Statistic from the build editor
- **Zero runtime dependencies** — pure Node.js
- **Full TypeScript types** — typed inputs and outputs, TSDoc-documented [API Reference](/api/)
- **Singleton loader** — engine loads once per process, subsequent builds are cheap
- **Catalog functions** — discover valid buffs, passives and toggle skills at runtime

## When to use it

Good fit:

- Build planners / stat calculators for ESO (web or Node backends)
- Tools that need to know "what will my stats be with this gear, CP and buffs?"
- Validating your own ESO math against UESP's golden reference

Not a fit:

- Game client modifications — this is a calculator, not an addon
- Damage logs or combat parsing — see [UESP Logs](https://esolog.uesp.net) instead

## How it works, in one paragraph

On `initEsoEngineFromData()`, the wrapper loads the vendored UESP scripts into Node's global scope, seeds them with game data you provide (formulas, buffs, CP rules, skills), and stubs the minimal DOM surface the engine expects. On each `calculateBuild()`, it writes your inputs into the engine's state, runs the engine's own `UpdateEsoComputedStatsList_Real()`, and reads the results out of `g_EsoComputedStats` into a typed `ComputedStats` object.

## Next steps

- [Getting Started](/getting-started) — install, init, first calculation
- [Guides](/guides/character) — every input in depth: items, CP, buffs, skills
- [Reading the Output](/output) — what comes back and how to use it
- [API Reference](/api/) — generated from the source TSDoc
