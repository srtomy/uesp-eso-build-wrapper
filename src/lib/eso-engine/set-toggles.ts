import type { EngineToggledSetEntry } from './engine-globals.js';
import type { SetToggle } from './types.js';

/**
 * Builds the list of set toggles that apply to the build currently loaded in
 * the engine, from `g_EsoBuildToggledSetData`.
 *
 * The engine recomputes each entry's `valid` flag on every calculation, so this
 * must be read right after the update — which is exactly where `calculateBuild`
 * calls it. Fresh objects are returned (not references into the engine state),
 * so a later calculation cannot mutate an already-returned list.
 */
export function collectSetToggles(toggleData: Record<string, EngineToggledSetEntry>): SetToggle[] {
  const result: SetToggle[] = [];

  for (const [id, toggle] of Object.entries(toggleData)) {
    if (!toggle.valid) continue;

    result.push({
      id,
      // Variant rules point at their base set via `setId`; fall back to the id.
      setId: toggle.setId || id,
      // `displayName` is usually empty; the rule id is the readable fallback.
      label: toggle.displayName || id,
      description: toggle.desc || '',
    });
  }

  return result;
}
