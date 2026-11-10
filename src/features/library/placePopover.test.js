import { describe, expect, it } from "vitest";
import { placePopover } from "./ShelfPopover";

const viewport = { width: 900, height: 700 };
const size = { width: 240, height: 200 };
const anchor = (left, top) => ({ left, top, bottom: top + 36 });

describe("placePopover", () => {
  it("opens under its button", () => {
    expect(placePopover(anchor(100, 100), size, viewport)).toEqual({ left: 100, top: 144 });
  });

  it("moves left so it never runs off the right edge", () => {
    expect(placePopover(anchor(800, 100), size, viewport).left).toBe(900 - 240 - 8);
  });

  it("opens upward when there is no room below", () => {
    expect(placePopover(anchor(100, 600), size, viewport).top).toBe(600 - 8 - 200);
  });

  it("stays on screen when there is room neither above nor below", () => {
    const top = placePopover(anchor(100, 150), { width: 240, height: 600 }, { width: 900, height: 640 }).top;
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top + 600).toBeLessThanOrEqual(640 - 8);
  });
});
