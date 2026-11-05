import { describe, expect, it } from "vitest";
import { isValidRoute } from "./usePathRoute";

describe("isValidRoute", () => {
  it("accepts every view the app renders", () => {
    ["all", "want", "reading", "done", "favorites", "recommendations", "topbooks", "analytics", "shelves", "galaxy", "shelf:Sci-Fi"].forEach(
      (route) => expect(isValidRoute(route)).toBe(true)
    );
  });

  it("rejects unknown paths and empty shelf names", () => {
    expect(isValidRoute("foo")).toBe(false);
    expect(isValidRoute("shelf:")).toBe(false);
    expect(isValidRoute("")).toBe(false);
  });
});
