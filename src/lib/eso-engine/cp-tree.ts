/**
 * Champion Points tree builder.
 *
 * `buildCpTree()` is a pure function over the extracted `cp2*` data.
 * `getCpTree()` is the public, lazily-memoized accessor used at runtime:
 * it reads the engine globals injected by the loader and builds the tree once
 * per process (the engine is a per-process singleton, so the globals never
 * change after init).
 */

import { engineGlobals } from './engine-globals.js';
import type { CpCluster, CpDiscipline, CpLink, CpNode, CpTree, UespInitData } from './types.js';

/** Subset of `UespInitData` needed to assemble a {@link CpTree}. */
export type CpTreeSource = Pick<
  UespInitData,
  'cpSkillsData' | 'cpSkillDescData' | 'cpDisciplinesData' | 'cpClusterRootsData' | 'cpLinksData'
>;

function parseJumpPoints(value: unknown): number[] {
  return String(value ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

function parseNumberList(value: unknown): number[] {
  return parseJumpPoints(value);
}

function isTrue(value: unknown): boolean {
  return value === true || value === 'true' || Number(value) === 1;
}

/** Assembles a {@link CpTree} from extracted `cp2*` data. Pure and testable. */
export function buildCpTree(source: CpTreeSource): CpTree {
  const cpSkillsData = source.cpSkillsData ?? {};

  const rawNodes = Object.values(cpSkillsData) as Record<string, unknown>[];
  const abilityBySkill = new Map<number, number>();
  for (const raw of rawNodes) {
    abilityBySkill.set(Number(raw.skillId), Number(raw.abilityId));
  }

  // Adjacency in abilityId space (symmetric). cpLinksData is the extracted
  // graph; fall back to an empty graph when it is absent.
  const linksGraph = source.cpLinksData ?? {};

  const adjacency = new Map<number, number[]>();
  for (const [parentKey, childIds] of Object.entries(linksGraph)) {
    const parentAbilityId = Number(parentKey);
    const list = adjacency.get(parentAbilityId) ?? [];
    for (const childAbilityId of childIds) list.push(childAbilityId);
    adjacency.set(parentAbilityId, list);
  }

  const roots: number[] = [];
  for (const raw of rawNodes) {
    if (isTrue(raw.isRoot)) roots.push(Number(raw.abilityId));
  }

  // BFS from every root to orient the (symmetric) graph into a tree.
  const depth = new Map<number, number>();
  const queue: number[] = [];
  for (const root of roots) {
    depth.set(root, 0);
    queue.push(root);
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current)!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!depth.has(neighbor)) {
        depth.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  const parentsByAbility = new Map<number, number[]>();
  for (const [parentAbilityId, childIds] of adjacency) {
    const parentDepth = depth.get(parentAbilityId);
    if (parentDepth === undefined) continue;
    for (const childAbilityId of childIds) {
      const childDepth = depth.get(childAbilityId);
      if (childDepth === undefined || parentDepth >= childDepth) continue;
      const list = parentsByAbility.get(childAbilityId) ?? [];
      list.push(parentAbilityId);
      parentsByAbility.set(childAbilityId, list);
    }
  }

  const nodes: CpNode[] = rawNodes.map((raw) => {
    const abilityId = Number(raw.abilityId);
    return {
      abilityId,
      skillId: Number(raw.skillId),
      name: String(raw.name ?? ''),
      disciplineIndex: Number(raw.disciplineIndex),
      skillType: Number(raw.skillType),
      maxPoints: Number(raw.maxPoints),
      jumpPoints: parseJumpPoints(raw.jumpPoints),
      jumpPointDelta: Number(raw.jumpPointDelta),
      isRoot: isTrue(raw.isRoot),
      isClusterRoot: isTrue(raw.isClusterRoot),
      parentIds: parentsByAbility.get(abilityId) ?? [],
      depth: depth.get(abilityId) ?? 0,
      x: Number(raw.x),
      y: Number(raw.y),
    };
  });

  // Reconstruct the skillId-space link list (for rendering) from the
  // abilityId graph, using the nodes' own abilityId↔skillId mapping.
  const skillByAbility = new Map<number, number>();
  for (const node of nodes) skillByAbility.set(node.abilityId, node.skillId);

  const links: CpLink[] = [];
  for (const [parentKey, childAbilities] of Object.entries(linksGraph)) {
    const parentSkillId = skillByAbility.get(Number(parentKey));
    if (parentSkillId === undefined) continue;
    for (const childAbilityId of childAbilities) {
      const skillId = skillByAbility.get(childAbilityId);
      if (skillId === undefined) continue;
      links.push({ parentSkillId, skillId });
    }
  }

  const descriptions: Record<number, string[]> = {};
  for (const [abilityKey, byPoints] of Object.entries(source.cpSkillDescData ?? {})) {
    const abilityId = Number(abilityKey);
    if (Number.isNaN(abilityId)) continue;
    const list: string[] = [];
    for (const [pointsKey, text] of Object.entries(byPoints)) {
      list[Number(pointsKey)] = text;
    }
    descriptions[abilityId] = list;
  }

  const disciplines: CpDiscipline[] = (source.cpDisciplinesData ?? [])
    .map((raw) => ({
      disciplineIndex: Number(raw.disciplineIndex),
      disciplineId: Number(raw.disciplineId),
      name: String(raw.name ?? ''),
      discType: Number(raw.discType),
      numSkills: Number(raw.numSkills),
    }))
    .sort((a, b) => a.disciplineIndex - b.disciplineIndex);

  const clusters: CpCluster[] = (source.cpClusterRootsData ?? [])
    .map((raw) => ({
      skillId: Number(raw.skillId),
      name: String(raw.name ?? ''),
      skills: parseNumberList(raw.skills),
      disciplineIndex: Number(raw.disciplineIndex),
      texture: String(raw.texture ?? ''),
    }))
    .sort((a, b) => a.disciplineIndex - b.disciplineIndex || a.skillId - b.skillId);

  return { disciplines, nodes, links, clusters, descriptions };
}

let cachedTree: CpTree | undefined;

/**
 * Returns the Champion Points tree, built once per process from the engine
 * globals. Must be called after `initEsoEngineFromData()`.
 *
 * The returned object is read-only — treat it as immutable (it is shared).
 */
export function getCpTree(): CpTree {
  return (cachedTree ??= buildCpTree({
    cpSkillsData: engineGlobals().g_EsoCpSkills as Record<string, unknown> | undefined,
    cpSkillDescData: engineGlobals().g_EsoCpSkillDesc,
    cpDisciplinesData: engineGlobals().g_EsoCpDisciplines,
    cpClusterRootsData: engineGlobals().g_EsoCpClusterRoots,
    cpLinksData: engineGlobals().g_EsoCpLinks,
  }));
}

/** Clears the memoized tree — called when the engine is (re)loaded. */
export function resetCpTreeCache(): void {
  cachedTree = undefined;
}
