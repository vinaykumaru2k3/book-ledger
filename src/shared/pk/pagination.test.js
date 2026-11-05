import { describe, expect, it } from "vitest";
import { pageWindow } from "./Pagination";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });

  it("keeps the first, last and neighbours, with a gap marker between", () => {
    expect(pageWindow(10, 20)).toEqual([1, "gap-9", 9, 10, 11, "gap-20", 20]);
  });

  it("does not add a gap when pages are adjacent", () => {
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, "gap-20", 20]);
    expect(pageWindow(19, 20)).toEqual([1, "gap-18", 18, 19, 20]);
  });
});
