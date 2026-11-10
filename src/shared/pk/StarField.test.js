import { describe, expect, it } from "vitest";
import { buildConstellation, createStars, pickConstellations } from "./StarField";

// A predictable "random" source so the tests are repeatable.
const seeded = (seed = 42) => {
  let a = seed >>> 0; // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe("StarField", () => {
  it("creates stars inside the canvas, with nearer stars bigger and brighter", () => {
    const stars = createStars(300, 800, 600, seeded());
    expect(stars).toHaveLength(300);
    stars.forEach((s) => {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(800);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(600);
    });
    const near = stars.filter((s) => s.depth > 0.8);
    const far = stars.filter((s) => s.depth < 0.2);
    const avg = (list, key) => list.reduce((sum, s) => sum + s[key], 0) / list.length;
    expect(avg(near, "r")).toBeGreaterThan(avg(far, "r"));
    expect(avg(near, "alpha")).toBeGreaterThan(avg(far, "alpha"));
  });

  it("builds a constellation by hopping to the nearest unused bright star", () => {
    const stars = [
      { x: 0, y: 0, depth: 0.9 },
      { x: 100, y: 0, depth: 0.9 },
      { x: 50, y: 0, depth: 0.9 },
      { x: 60, y: 0, depth: 0.1 }, // too faint to join
      { x: 160, y: 0, depth: 0.9 },
    ];
    expect(buildConstellation(stars, 0, 4)).toEqual([0, 2, 1, 4]);
  });

  it("stops when no bright star is within reach", () => {
    const stars = [
      { x: 0, y: 0, depth: 0.9 },
      { x: 900, y: 0, depth: 0.9 },
    ];
    expect(buildConstellation(stars, 0, 5)).toEqual([0]);
  });

  it("picks separate constellations of at least four stars", () => {
    const stars = createStars(600, 1400, 900, seeded(17));
    const picked = pickConstellations(stars, 1400, 4, seeded(73));
    expect(picked.length).toBeGreaterThan(0);
    picked.forEach((chain) => {
      expect(chain.length).toBeGreaterThanOrEqual(4);
      expect(new Set(chain).size).toBe(chain.length);
    });
  });
});
