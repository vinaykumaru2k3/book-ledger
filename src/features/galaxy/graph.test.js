import { describe, expect, it } from "vitest";
import { buildGraphData } from "./graph";
import { screenToWorld, stepSimulation } from "./graphSimulation";

const book = (id, extra = {}) => ({ id, title: id, author: "", status: "want", ...extra });

describe("buildGraphData", () => {
  it("links books by author, shelf and tag with weights", () => {
    const { links } = buildGraphData([
      book("a", { author: "Orwell", shelves: ["Classics"], tags: ["Satire"] }),
      book("b", { author: "orwell", shelves: ["Classics"], tags: ["satire"] }),
      book("c", { author: "Other" }),
    ]);
    expect(links).toHaveLength(1);
    expect(links[0].weight).toBe(3 + 2 + 1);
  });

  it("ignores the generic General tag", () => {
    const { links } = buildGraphData([book("a", { tags: ["General"] }), book("b", { tags: ["General"] })]);
    expect(links).toHaveLength(0);
  });

  it("handles an empty library", () => {
    expect(buildGraphData([])).toEqual({ nodes: [], links: [] });
  });
});

describe("stepSimulation", () => {
  const node = (id, x, y) => ({ id, x, y, vx: 0, vy: 0, status: "want", author: id });

  it("pushes overlapping nodes apart", () => {
    const nodes = [node("a", 0, 0), node("b", 10, 0)];
    for (let i = 0; i < 20; i += 1) stepSimulation(nodes, []);
    expect(Math.abs(nodes[1].x - nodes[0].x)).toBeGreaterThan(10);
  });

  it("does not move the pinned (dragged) node", () => {
    const nodes = [node("a", 5, 5), node("b", 8, 5)];
    stepSimulation(nodes, [], { pinnedId: "a" });
    expect(nodes[0]).toMatchObject({ x: 5, y: 5 });
  });

  it("settles: energy falls as the temperature drops", () => {
    const nodes = [node("a", 0, 0), node("b", 40, 0), node("c", 0, 40)];
    const links = [{ source: nodes[0], target: nodes[1], weight: 3, reasons: [] }];
    let energy = Infinity;
    for (let i = 0; i < 600; i += 1) energy = stepSimulation(nodes, links, { alpha: Math.max(0.05, 0.985 ** i) });
    expect(energy).toBeLessThan(0.5);
  });
});

describe("screenToWorld", () => {
  it("maps the middle of the svg to the camera position", () => {
    const rect = { width: 1600, height: 1200 };
    const w = screenToWorld(800, 600, rect, { x: 10, y: -20, zoom: 2 });
    expect(w.x).toBeCloseTo(10);
    expect(w.y).toBeCloseTo(-20);
    expect(w.scale).toBe(2);
  });

  it("accounts for letterboxing when the svg is wider than the viewBox ratio", () => {
    const rect = { width: 2000, height: 600 }; // viewBox is centred horizontally
    const w = screenToWorld(1000, 300, rect, { x: 0, y: 0, zoom: 1 });
    expect(w.x).toBeCloseTo(0);
    expect(w.y).toBeCloseTo(0);
  });
});
