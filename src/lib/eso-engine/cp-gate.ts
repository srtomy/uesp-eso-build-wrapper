/**
 * Champion Points purchaseability gate — a faithful port of the UESP esolog
 * algorithm.
 *
 * This module is intentionally PURE: it imports only types, never the engine
 * globals or Node APIs, so it can run both in Node and in the browser
 * (published as the `uesp-eso-build-wrapper/cp-gate` subpath).
 *
 * References (vendored UESP sources):
 *   - `vendor/uesp-esolog/viewCps.class.php:164`  `CreateCp2LinksData()`
 *   - `vendor/uesp-esolog/viewCps.class.php:214`  `CreateCp2UnlockData()`
 *   - `vendor/uesp-esolog/resources/esocp_simple.js:684` `UpdateCP2SkillPurchaseable()`
 *
 * Semantics (mirrors UESP):
 *   A node is purchaseable when it is reachable from a root along the
 *   (symmetric) link graph, where every node you traverse *through* must have
 *   `points >= jumpPointDelta`. Visiting a node always marks it purchaseable,
 *   even when it has no points yet (that is how you buy it).
 */

import type { CpLink, CpNode } from './types.js';

/** Minimal node fields required by the gate. */
export interface CpGateNode {
  abilityId: number;
  isRoot: boolean;
  jumpPointDelta: number;
}

/** Raw link row in `skillId` space (`cp2SkillLinks`). */
export interface CpRawLink {
  parentSkillId: number;
  skillId: number;
}

/**
 * Maps raw `cp2SkillLinks` rows (skillId space) to the abilityId adjacency
 * graph — the equivalent of the UESP `g_EsoCpLinks` global
 * (`CreateCp2LinksData`). Kept symmetric: each edge appears in both directions,
 * exactly as the dump provides it.
 */
export function buildCpLinks(
  links: readonly CpRawLink[],
  skillIdToAbilityId: ReadonlyMap<number, number>,
): Record<number, number[]> {
  const graph: Record<number, number[]> = {};
  for (const { parentSkillId, skillId } of links) {
    const parentAbilityId = skillIdToAbilityId.get(parentSkillId);
    const childAbilityId = skillIdToAbilityId.get(skillId);
    if (parentAbilityId == null || childAbilityId == null) continue;
    (graph[parentAbilityId] ??= []).push(childAbilityId);
  }
  return graph;
}

/** `childAbilityId → [parentAbilityIds]` (inverse of a children map). */
export function buildCpParentMap(
  children: Readonly<Record<number, number[]>>,
): Map<number, number[]> {
  const parents = new Map<number, number[]>();
  for (const [parentKey, childIds] of Object.entries(children)) {
    const parentId = Number(parentKey);
    if (Number.isNaN(parentId)) continue;
    for (const childId of childIds) {
      const list = parents.get(childId) ?? [];
      list.push(parentId);
      parents.set(childId, list);
    }
  }
  return parents;
}

/**
 * Flood-fill from every root, returning the set of purchaseable abilityIds for
 * the current allocation.
 *
 * `visited` is reset at each root (as in UESP), so a node reachable from any
 * root counts. Traversal stops at a node whose points are below its
 * `jumpPointDelta`.
 */
export function computePurchaseableNodes(
  nodes: readonly CpGateNode[],
  graph: Readonly<Record<number, number[]>>,
  getPoints: (abilityId: number) => number,
): Set<number> {
  const nodeById = new Map<number, CpGateNode>();
  for (const node of nodes) nodeById.set(node.abilityId, node);

  const visited = new Set<number>();
  const purchaseable = new Set<number>();

  const visit = (abilityId: number): void => {
    if (visited.has(abilityId)) return;
    visited.add(abilityId);
    purchaseable.add(abilityId);

    const node = nodeById.get(abilityId);
    if (!node) return;
    if (getPoints(abilityId) < node.jumpPointDelta) return;

    for (const neighbor of graph[abilityId] ?? []) visit(neighbor);
  };

  for (const node of nodes) {
    if (!node.isRoot) continue;
    visited.clear();
    visit(node.abilityId);
  }

  return purchaseable;
}

/**
 * Convenience single-node check. Prefer {@link createCpGate} /
 * {@link computePurchaseableNodes} when checking more than one node, since this
 * recomputes the whole flood-fill per call.
 */
export function isCpNodePurchaseable(
  abilityId: number,
  nodes: readonly CpGateNode[],
  graph: Readonly<Record<number, number[]>>,
  getPoints: (abilityId: number) => number,
): boolean {
  return computePurchaseableNodes(nodes, graph, getPoints).has(abilityId);
}

/** A reusable, stateless gate built from a tree's nodes and links. */
export interface CpGate {
  /** All nodes purchaseable for the current allocation. */
  purchaseable(getPoints: (abilityId: number) => number): Set<number>;
  /** Whether a single node is purchaseable for the current allocation. */
  isPurchaseable(abilityId: number, getPoints: (abilityId: number) => number): boolean;
}

/**
 * Builds a reusable gate from a tree's nodes and links.
 *
 * The link graph is translated from `skillId` space to `abilityId` space using
 * the nodes' own mapping, so callers only need the tree — not `cpLinksData`.
 */
export function createCpGate(nodes: readonly CpNode[], links: readonly CpLink[]): CpGate {
  const abilityBySkill = new Map<number, number>();
  const gateNodes: CpGateNode[] = nodes.map((node) => {
    abilityBySkill.set(node.skillId, node.abilityId);
    return {
      abilityId: node.abilityId,
      isRoot: node.isRoot,
      jumpPointDelta: node.jumpPointDelta,
    };
  });

  const graph: Record<number, number[]> = {};
  for (const { parentSkillId, skillId } of links) {
    const parentAbilityId = abilityBySkill.get(parentSkillId);
    const childAbilityId = abilityBySkill.get(skillId);
    if (parentAbilityId == null || childAbilityId == null) continue;
    (graph[parentAbilityId] ??= []).push(childAbilityId);
  }

  return {
    purchaseable: (getPoints) => computePurchaseableNodes(gateNodes, graph, getPoints),
    isPurchaseable: (abilityId, getPoints) =>
      computePurchaseableNodes(gateNodes, graph, getPoints).has(abilityId),
  };
}
