import { describe, expect, it } from "vitest";
import { buildQuadtree, convexHull, fitCamera, stepLayout } from "./forceLayout";
import { settleLayout } from "./useForceLayout";

const grid = (count, spacing = 30) =>
  Array.from({ length: count }, (_, i) => ({ id: `n${i}`, x: (i % 20) * spacing + (i % 7), y: Math.floor(i / 20) * spacing + (i % 5), vx: 0, vy: 0 }));

const sumMass = (c) => (!c ? 0 : c.kids ? c.kids.reduce((s, k) => s + sumMass(k), 0) : (c.node ? c.node.mass ?? 1 : 0) + (c.extra || []).reduce((s, e) => s + (e.mass ?? 1), 0));

describe("buildQuadtree", () => {
  it("holds every node's mass, with the centre of mass at the root", () => {
    const nodes = grid(50);
    nodes[3].mass = 0.5;
    const root = buildQuadtree(nodes);
    expect(root.mass).toBeCloseTo(49.5);
    expect(sumMass(root)).toBeCloseTo(49.5);
    const cx = nodes.reduce((s, n) => s + n.x * (n.mass ?? 1), 0) / 49.5;
    expect(root.cx).toBeCloseTo(cx);
  });

  it("copes with nodes on exactly the same spot", () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({ id: i, x: 10, y: 10, vx: 0, vy: 0 }));
    expect(buildQuadtree(nodes).mass).toBe(5);
  });
});

describe("stepLayout", () => {
  it("approximates repulsion closely for big pictures (Barnes–Hut)", () => {
    const exact = grid(260);
    const approx = exact.map((n) => ({ ...n }));
    const options = { centerGravity: 0, alpha: 1 };
    stepLayout(exact, [], { ...options, approximateAbove: Infinity });
    stepLayout(approx, [], { ...options, approximateAbove: 200 });
    const speed = exact.reduce((s, n) => s + Math.hypot(n.vx, n.vy), 0);
    const error = exact.reduce((s, n, i) => s + Math.hypot(n.vx - approx[i].vx, n.vy - approx[i].vy), 0);
    expect(error / speed).toBeLessThan(0.1);
  });

  it("does not move a pinned node, and pulls linked nodes together", () => {
    const a = { id: "a", x: 0, y: 0, vx: 0, vy: 0 };
    const b = { id: "b", x: 400, y: 0, vx: 0, vy: 0 };
    stepLayout([a, b], [{ source: a, target: b }], { pinnedId: "a", linkDistance: 50, linkStrength: 0.2, charge: 0 });
    expect(a.x).toBe(0);
    expect(b.x).toBeLessThan(400);
  });

  it("pulls members of a group toward each other, ignoring the null group", () => {
    const nodes = [
      { id: "a", x: -100, y: 0, vx: 0, vy: 0, g: "x" },
      { id: "b", x: 100, y: 0, vx: 0, vy: 0, g: "x" },
      { id: "c", x: 0, y: 300, vx: 0, vy: 0, g: null },
    ];
    stepLayout(nodes, [], { charge: 0, centerGravity: 0, groupOf: (n) => n.g, groupStrength: 0.1 });
    expect(nodes[0].x).toBeGreaterThan(-100);
    expect(nodes[1].x).toBeLessThan(100);
    expect(nodes[2].y).toBe(300);
  });

  it("comes to rest when settled", () => {
    const nodes = grid(30);
    settleLayout(nodes, []);
    nodes.forEach((n) => {
      expect(n.vx).toBe(0);
      expect(Number.isFinite(n.x)).toBe(true);
    });
  });
});

describe("fitCamera", () => {
  it("centres on the nodes and zooms to fit them inside the margin", () => {
    const cam = fitCamera(
      [
        { x: -100, y: -50 },
        { x: 300, y: 50 },
      ],
      { width: 800, height: 600 },
      { margin: 0, maxZoom: 5 }
    );
    expect(cam).toEqual({ x: 100, y: 0, zoom: 2 });
  });

  it("keeps the zoom within limits and handles no nodes", () => {
    expect(fitCamera([{ x: 0, y: 0 }]).zoom).toBe(1.5);
    expect(fitCamera([])).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe("convexHull", () => {
  it("drops the points inside", () => {
    const hull = convexHull([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 5],
      [3, 7],
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual([5, 5]);
  });

  it("returns short lists as they are", () => {
    expect(convexHull([[1, 2]])).toEqual([[1, 2]]);
  });
});
