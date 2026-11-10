// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALPHA_MIN, settleNow, useForceSimulation } from "./useForceSimulation";
import { buildGraphData, graphSignature } from "./graph";

// A manual animation-frame clock so the test controls exactly how many frames run.
let queue;
let scheduled;
beforeEach(() => {
  queue = [];
  scheduled = 0;
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    scheduled += 1;
    queue.push(callback);
    return scheduled;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  window.matchMedia = () => ({ matches: false });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.matchMedia;
});

const runFrames = (max) => {
  let ran = 0;
  while (queue.length && ran < max) {
    const next = queue.shift();
    act(() => next());
    ran += 1;
  }
  return ran;
};

const books = [
  { id: "a", title: "A", author: "X", shelves: ["s"], tags: ["t"], status: "want" },
  { id: "b", title: "B", author: "X", shelves: ["s"], tags: ["t"], status: "reading" },
  { id: "c", title: "C", author: "Y", shelves: [], tags: [], status: "done" },
];

describe("useForceSimulation", () => {
  it("cools down and then stops asking for frames (no endless animation)", () => {
    const graph = buildGraphData(books);
    renderHook(() => useForceSimulation(graph, "none", () => null));
    const frames = runFrames(2000);
    expect(frames).toBeGreaterThan(50); // it animated for a while...
    expect(frames).toBeLessThan(400); // ...and then stopped by itself
    expect(queue).toHaveLength(0);
    expect(graph.nodes.every((n) => n.vx === 0 && n.vy === 0)).toBe(true);
  });

  it("does not keep re-rendering once at rest", () => {
    const graph = buildGraphData(books);
    const hook = renderHook(() => useForceSimulation(graph, "none", () => null));
    runFrames(2000);
    const before = hook.result.current.frame;
    runFrames(50);
    expect(hook.result.current.frame).toBe(before);
  });

  it("wakes up immediately when a node is dragged, then settles again", () => {
    const graph = buildGraphData(books);
    const hook = renderHook(() => useForceSimulation(graph, "none", () => null));
    runFrames(2000);
    expect(queue).toHaveLength(0);

    act(() => {
      hook.result.current.heat.current = 0.5;
      hook.result.current.wake();
    });
    expect(queue).toHaveLength(1);
    expect(runFrames(2000)).toBeGreaterThan(10);
    expect(queue).toHaveLength(0);
  });

  it("keeps animating while a node is held, however cool it is", () => {
    const graph = buildGraphData(books);
    let held = graph.nodes[0];
    renderHook(() => useForceSimulation(graph, "none", () => held));
    expect(runFrames(600)).toBe(600);
    held = null;
    runFrames(10);
    expect(queue).toHaveLength(0);
  });

  it("starts over (and stays at rest afterwards) when the graph changes", () => {
    const first = buildGraphData(books);
    const second = buildGraphData(books.slice(0, 2));
    const hook = renderHook(({ graph }) => useForceSimulation(graph, "none", () => null), { initialProps: { graph: first } });
    runFrames(2000);
    hook.rerender({ graph: second });
    expect(queue.length).toBeGreaterThan(0);
    runFrames(2000);
    expect(queue).toHaveLength(0);
  });

  it("draws a calm, finished layout at once for people who prefer reduced motion", () => {
    window.matchMedia = () => ({ matches: true });
    const graph = buildGraphData(books);
    const start = graph.nodes.map((n) => [n.x, n.y]);
    renderHook(() => useForceSimulation(graph, "none", () => null));
    expect(queue).toHaveLength(0); // no animation frames at all
    expect(graph.nodes.map((n) => [n.x, n.y])).not.toEqual(start); // but the layout was computed
  });

  it("settleNow leaves nodes still", () => {
    const graph = buildGraphData(books);
    settleNow(graph.nodes, graph.links, "status");
    expect(graph.nodes.every((n) => n.vx === 0 && n.vy === 0)).toBe(true);
    expect(ALPHA_MIN).toBeGreaterThan(0);
  });
});

describe("graphSignature", () => {
  it("is the same for equal data under a new array identity, so the layout is kept", () => {
    expect(graphSignature(books)).toBe(graphSignature(books.map((b) => ({ ...b }))));
  });

  it("changes when something drawn changes", () => {
    const changed = books.map((b, i) => (i === 0 ? { ...b, status: "done" } : b));
    expect(graphSignature(changed)).not.toBe(graphSignature(books));
  });

  it("ignores fields that are not drawn (e.g. notes, timestamps)", () => {
    const touched = books.map((b) => ({ ...b, notes: "new notes", updatedAt: 123 }));
    expect(graphSignature(touched)).toBe(graphSignature(books));
  });
});
