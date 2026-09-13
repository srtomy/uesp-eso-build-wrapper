/**
 * Tests for the Champion Points tree builder and the getCpTree() accessor.
 *
 * buildCpTree is pure; getCpTree reads the engine globals loaded from the
 * committed uesp-game-data.json.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { initEsoEngineFromData } from '../src/lib/eso-engine';
import { getCpTree, buildCpTree, resetCpTreeCache } from '../src/lib/eso-engine/cp-tree';
import { createCpGate } from '../src/lib/eso-engine/cp-gate';
import { loadInitData } from '../src/lib/uesp-data';

beforeAll(() => {
  initEsoEngineFromData({ initData: loadInitData() });
});

// ── buildCpTree (pure) ───────────────────────────────────────────────────────

describe('buildCpTree', () => {
  const source = {
    cpSkillsData: {
      '141898': {
        abilityId: '141898',
        skillId: '68',
        name: 'Precision',
        disciplineIndex: '2',
        skillType: '0',
        maxPoints: '20',
        jumpPoints: '0,10,20',
        jumpPointDelta: '10',
        isRoot: '1',
        isClusterRoot: '0',
        x: '0.25',
        y: '0.50',
      },
      '141895': {
        abilityId: '141895',
        skillId: '10',
        name: 'Piercing',
        disciplineIndex: '2',
        skillType: '0',
        maxPoints: '20',
        jumpPoints: '0,10,20',
        jumpPointDelta: '10',
        isRoot: '0',
        isClusterRoot: '1',
        x: '0.30',
        y: '0.55',
      },
    },
    cpLinksData: { '141898': [141895], '141895': [141898] },
    cpSkillDescData: { '141895': { 0: 'none', 10: '350' } },
    cpDisciplinesData: [
      { disciplineIndex: 2, disciplineId: 1, name: 'Warfare', discType: 0, numSkills: 48 },
    ],
    cpClusterRootsData: [
      {
        skillId: 10,
        name: 'Master-at-Arms',
        skills: '10,11,12',
        disciplineIndex: 2,
        texture: '/x.dds',
      },
    ],
  };

  it('parses nodes, jumpPoints and boolean flags', () => {
    const tree = buildCpTree(source);
    expect(tree.nodes).toHaveLength(2);
    const piercing = tree.nodes.find((n) => n.abilityId === 141895)!;
    expect(piercing.jumpPoints).toEqual([0, 10, 20]);
    expect(piercing.jumpPointDelta).toBe(10);
    expect(piercing.isRoot).toBe(false);
    expect(piercing.isClusterRoot).toBe(true);
  });

  it('orients the symmetric graph into parentIds/depth via BFS from roots', () => {
    const tree = buildCpTree(source);
    const precision = tree.nodes.find((n) => n.abilityId === 141898)!;
    const piercing = tree.nodes.find((n) => n.abilityId === 141895)!;
    expect(precision.parentIds).toEqual([]);
    expect(precision.depth).toBe(0);
    expect(piercing.parentIds).toEqual([141898]);
    expect(piercing.depth).toBe(1);
  });

  it('reconstructs links in skillId space', () => {
    const tree = buildCpTree(source);
    expect(tree.links).toEqual(
      expect.arrayContaining([
        { parentSkillId: 68, skillId: 10 },
        { parentSkillId: 10, skillId: 68 },
      ]),
    );
  });

  it('maps descriptions to abilityId index by points', () => {
    const tree = buildCpTree(source);
    expect(tree.descriptions[141895][10]).toBe('350');
  });

  it('parses cluster skills CSV and disciplines', () => {
    const tree = buildCpTree(source);
    expect(tree.clusters[0]).toMatchObject({
      skillId: 10,
      name: 'Master-at-Arms',
      skills: [10, 11, 12],
    });
    expect(tree.disciplines[0]).toMatchObject({ name: 'Warfare', disciplineIndex: 2 });
  });
});

// ── getCpTree (real data) ────────────────────────────────────────────────────

describe('getCpTree — real game data', () => {
  it('returns 3 disciplines, 118 nodes, 260 links and 6 clusters', () => {
    const tree = getCpTree();
    expect(tree.disciplines).toHaveLength(3);
    expect(tree.nodes).toHaveLength(118);
    expect(tree.links).toHaveLength(260);
    expect(tree.clusters).toHaveLength(6);
    expect(Object.keys(tree.descriptions)).toHaveLength(118);
  });

  it('resolves a known node (Arcane Supremacy, 141744)', () => {
    const node = getCpTree().nodes.find((n) => n.abilityId === 141744);
    expect(node?.name).toBe('Arcane Supremacy');
    expect(node?.skillType).toBe(2);
    expect(node?.isRoot).toBe(true);
  });

  it('memoizes the tree and resetCpTreeCache rebuilds it', () => {
    const first = getCpTree();
    expect(getCpTree()).toBe(first);
    resetCpTreeCache();
    const rebuilt = getCpTree();
    expect(rebuilt).not.toBe(first);
    expect(rebuilt.nodes).toHaveLength(118);
  });

  it('gate: roots are purchaseable with zero points, non-roots are not', () => {
    const tree = getCpTree();
    const gate = createCpGate(tree.nodes, tree.links);
    expect(gate.isPurchaseable(242521, () => 0)).toBe(true);
    expect(gate.isPurchaseable(141895, () => 0)).toBe(false);
  });

  it('gate: investing in the parent unlocks the child', () => {
    const tree = getCpTree();
    const gate = createCpGate(tree.nodes, tree.links);
    expect(gate.isPurchaseable(141895, (id) => (id === 141898 ? 10 : 0))).toBe(true);
  });
});
