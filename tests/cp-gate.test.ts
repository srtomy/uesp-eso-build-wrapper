/**
 * Tests for the Champion Points purchaseability gate.
 *
 * The gate is a faithful port of the UESP esolog flood-fill:
 *   vendor/uesp-esolog/viewCps.class.php:214  CreateCp2UnlockData
 *   vendor/uesp-esolog/resources/esocp_simple.js:684 UpdateCP2SkillPurchaseable
 *
 * These tests are pure (no engine init): they build small graphs and assert
 * the flood-fill semantics.
 */

import { describe, expect, it } from 'vitest';
import {
  buildCpLinks,
  buildCpParentMap,
  computePurchaseableNodes,
  createCpGate,
  isCpNodePurchaseable,
  type CpGateNode,
} from '../src/lib/eso-engine/cp-gate';
import type { CpLink, CpNode } from '../src/lib/eso-engine/types';

// Graph: 1 (root, delta 10) — 2 (delta 10) — 3 (delta 5).
// Symmetric, as the dump provides it.
const NODES: CpGateNode[] = [
  { abilityId: 1, isRoot: true, jumpPointDelta: 10 },
  { abilityId: 2, isRoot: false, jumpPointDelta: 10 },
  { abilityId: 3, isRoot: false, jumpPointDelta: 5 },
];

const GRAPH: Record<number, number[]> = {
  1: [2],
  2: [1, 3],
  3: [2],
};

function pointsFrom(entries: Record<number, number>): (id: number) => number {
  return (id) => entries[id] ?? 0;
}

describe('computePurchaseableNodes', () => {
  it('with zero points, only the root is purchaseable', () => {
    const set = computePurchaseableNodes(NODES, GRAPH, pointsFrom({}));
    expect([...set]).toEqual([1]);
  });

  it('a funded root unlocks its neighbour even with 0 points in it', () => {
    const set = computePurchaseableNodes(NODES, GRAPH, pointsFrom({ 1: 10 }));
    expect(set.has(2)).toBe(true);
    expect(set.has(3)).toBe(false);
  });

  it('does not traverse a node without enough points', () => {
    const set = computePurchaseableNodes(NODES, GRAPH, pointsFrom({ 1: 10, 2: 0 }));
    expect(set.has(3)).toBe(false);
  });

  it('traverses a chain when every intermediate node has the delta', () => {
    const set = computePurchaseableNodes(NODES, GRAPH, pointsFrom({ 1: 10, 2: 10 }));
    expect(set).toEqual(new Set([1, 2, 3]));
  });

  it('a node without a reachable root is not purchaseable', () => {
    const orphan: CpGateNode[] = [...NODES, { abilityId: 99, isRoot: false, jumpPointDelta: 0 }];
    const set = computePurchaseableNodes(orphan, GRAPH, pointsFrom({ 1: 10, 2: 10 }));
    expect(set.has(99)).toBe(false);
  });
});

describe('isCpNodePurchaseable', () => {
  it('node 3 exige a cadeia investida', () => {
    expect(isCpNodePurchaseable(3, NODES, GRAPH, pointsFrom({ 1: 10 }))).toBe(false);
    expect(isCpNodePurchaseable(3, NODES, GRAPH, pointsFrom({ 1: 10, 2: 10 }))).toBe(true);
  });

  it('an unknown id is never purchaseable', () => {
    expect(isCpNodePurchaseable(12345, NODES, GRAPH, pointsFrom({ 1: 10, 2: 10 }))).toBe(false);
  });
});

describe('buildCpLinks', () => {
  it('maps skillId → abilityId keeping the graph symmetric', () => {
    const skillIdToAbilityId = new Map([
      [100, 1],
      [200, 2],
    ]);
    const graph = buildCpLinks(
      [
        { parentSkillId: 100, skillId: 200 },
        { parentSkillId: 200, skillId: 100 },
      ],
      skillIdToAbilityId,
    );
    expect(graph).toEqual({ 1: [2], 2: [1] });
  });

  it('ignores links whose skillId has no abilityId', () => {
    const graph = buildCpLinks([{ parentSkillId: 1, skillId: 2 }], new Map());
    expect(graph).toEqual({});
  });
});

describe('buildCpParentMap', () => {
  it('inverts the children map into parents', () => {
    const parents = buildCpParentMap({ 1: [2, 3], 4: [3] });
    expect(parents.get(2)).toEqual([1]);
    expect(parents.get(3)).toEqual([1, 4]);
  });
});

describe('createCpGate (skillId space)', () => {
  const nodes: CpNode[] = NODES.map((n, i) => ({
    ...n,
    skillId: 1000 + i,
    name: `n${n.abilityId}`,
    disciplineIndex: 1,
    skillType: 0,
    maxPoints: 20,
    jumpPoints: [0, 10, 20],
    isClusterRoot: false,
    parentIds: [],
    depth: 0,
    x: 0,
    y: 0,
  }));
  const links: CpLink[] = [
    { parentSkillId: 1000, skillId: 1001 },
    { parentSkillId: 1001, skillId: 1000 },
    { parentSkillId: 1001, skillId: 1002 },
    { parentSkillId: 1002, skillId: 1001 },
  ];

  it('maps skillId links to abilityId and applies the gate', () => {
    const gate = createCpGate(nodes, links);
    expect(gate.purchaseable(pointsFrom({ 1: 10 }))).toEqual(new Set([1, 2]));
    expect(gate.isPurchaseable(3, pointsFrom({ 1: 10, 2: 10 }))).toBe(true);
  });
});
