import { describe, expect, it } from "vitest";
import { buildUpdates, cleanTags, needsEnrichment } from "./enrichment";

describe("cleanTags", () => {
  it("splits Google-style category paths, dedupes and caps at three", () => {
    expect(cleanTags(["Fiction / Science Fiction", "Fiction", "Space", "Politics"])).toEqual([
      "Fiction",
      "Science Fiction",
      "Space",
    ]);
  });

  it("falls back to General", () => {
    expect(cleanTags([])).toEqual(["General"]);
    expect(cleanTags(undefined)).toEqual(["General"]);
  });
});

describe("buildUpdates", () => {
  it("only fills gaps and never overwrites existing data", () => {
    const data = { tags: ["Fiction"], pages: 300 };
    expect(buildUpdates({ tags: [], pages: 0 }, data)).toEqual({ tags: ["Fiction"], pages: 300 });
    expect(buildUpdates({ tags: ["Mine"], pages: 120 }, data)).toEqual({});
  });
});

describe("needsEnrichment", () => {
  it("is true when tags or pages are missing", () => {
    expect(needsEnrichment({ title: "x", tags: [], pages: 10 })).toBe(true);
    expect(needsEnrichment({ title: "x", tags: ["a"], pages: 0 })).toBe(true);
    expect(needsEnrichment({ title: "x", tags: ["a"], pages: 10 })).toBe(false);
  });
});
