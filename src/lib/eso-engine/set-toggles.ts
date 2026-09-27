import type { EngineToggledSetEntry } from './engine-globals.js';
import type { SetToggle } from './types.js';

/**
 * Description for a toggle: the part of the set bonus the rule actually matches
 * (e.g. the interrupt sentence for a "(Bonus Damage)" variant), so toggles that
 * share a set bonus line get distinct descriptions. Falls back to the full line
 * when the rule has no regex or it doesn't match.
 */
function toggleDescription(toggle: EngineToggledSetEntry): string {
  const desc = toggle.desc ?? '';
  const match = toggle.matchData?.match;
  if (!desc || !match) return desc;

  return desc.match(match)?.[0] ?? desc;
}

/**
 * Builds the list of set toggles that apply to the build currently loaded in
 * the engine, from `g_EsoBuildToggledSetData`.
 *
 * The engine recomputes each entry's `valid` flag on every calculation, so this
 * must be read right after the update — which is exactly where `calculateBuild`
 * calls it. Fresh objects are returned (not references into the engine state),
 * so a later calculation cannot mutate an already-returned list.
 */
export function collectSetToggles(
  toggleData: Record<string, EngineToggledSetEntry> | undefined,
): SetToggle[] {
  const result: SetToggle[] = [];
  if (!toggleData) return result;

  for (const [id, toggle] of Object.entries(toggleData)) {
    if (!toggle.valid) continue;

    result.push({
      id,
      // Variant rules point at their base set via `setId`; fall back to the id.
      setId: toggle.setId || id,
      // `displayName` is usually empty; the rule id is the readable fallback.
      label: toggle.displayName || id,
      description: toggleDescription(toggle),
      minTimes: toggle.minTimes ?? 0,
      maxTimes: toggle.maxTimes ?? null,
      count: toggle.count ?? 0,
    });
  }

  return result;
}
