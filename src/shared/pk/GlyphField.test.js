import { describe, expect, it } from "vitest";
import { createParticles, stepParticles } from "./GlyphField";

// A predictable "random" source so the test is repeatable.
const seeded = () => {
  let value = 0.42;
  return () => (value = (value * 9301 + 49297) % 233280 / 233280);
};

describe("GlyphField particles", () => {
  it("creates the requested number of glyphs inside the canvas, drawn from the given letters", () => {
    const particles = createParticles(50, 300, 200, "ಅಆab", seeded());
    expect(particles).toHaveLength(50);
    particles.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(300);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(200);
      expect(["ಅ", "ಆ", "a", "b"]).toContain(p.glyph);
      expect(p.vy).toBeLessThan(0); // they all drift upward
    });
  });

  it("wraps glyphs that float off the top back to the bottom", () => {
    const particle = { x: 10, y: -41, vx: 0, vy: -1, angle: 0, spin: 0 };
    stepParticles([particle], 300, 200);
    expect(particle.y).toBe(240);
  });

  it("wraps glyphs sideways too", () => {
    const left = { x: -41, y: 50, vx: -1, vy: 0, angle: 0, spin: 0 };
    const right = { x: 341, y: 50, vx: 1, vy: 0, angle: 0, spin: 0 };
    stepParticles([left, right], 300, 200);
    expect(left.x).toBe(340);
    expect(right.x).toBe(-40);
  });
});
