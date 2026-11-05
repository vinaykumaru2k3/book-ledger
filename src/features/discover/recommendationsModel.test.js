import { describe, expect, it } from "vitest";
import { normalizeBook } from "../../domain/book";
import { buildTasteProfile, pickRecommendations, planQueries, shuffled } from "./recommendationsModel";
import { curateChart } from "./topChartFilters";

const owned = [
  normalizeBook({ title: "Dune", author: "Frank Herbert", genres: ["Science Fiction"] }),
  normalizeBook({ title: "Emma", author: "Jane Austen", tags: ["Classics", "Reading"] }),
  normalizeBook({ title: "Persuasion", author: "Jane Austen", tags: ["Classics"] }),
];

const doc = (key, title, extra = {}) => ({ key, title, author_name: ["A"], cover_i: 1, ...extra });
const noShuffle = () => 0.999; // keeps Fisher-Yates order stable

describe("buildTasteProfile", () => {
  it("ranks authors and genres by frequency and ignores state-like tags", () => {
    const profile = buildTasteProfile(owned);
    expect(profile.topAuthors[0]).toBe("Jane Austen");
    expect(profile.topGenres[0]).toBe("classics");
    expect(profile.topGenres).not.toContain("reading");
    expect(profile.inspiredBy("author", "Frank Herbert").title).toBe("Dune");
    expect(profile.inspiredBy("genre", "Science Fiction").title).toBe("Dune");
  });
});

describe("planQueries", () => {
  it("queries authors and genres from the library", () => {
    const queries = planQueries(buildTasteProfile(owned), noShuffle);
    expect(queries.filter((q) => q.param === "author")).toHaveLength(2);
    expect(queries.every((q) => q.reason)).toBe(true);
  });

  it("falls back to popular subjects for an empty library", () => {
    const queries = planQueries(buildTasteProfile([]), noShuffle);
    expect(queries).toHaveLength(3);
    expect(queries[0].reason).toMatch(/^Popular in/);
  });
});

describe("pickRecommendations", () => {
  const query = { reason: "r", inspiringBook: null };

  it("drops owned books, duplicates, textbooks and coverless editions", () => {
    const docs = [
      doc("1", "Dune", { author_name: ["Frank Herbert"] }),
      doc("2", "New Book"),
      doc("3", "new book!"),
      doc("4", "Physics Textbook"),
      doc("5", "No Cover", { cover_i: undefined }),
    ];
    const picks = pickRecommendations([{ query, docs }], owned, noShuffle);
    expect(picks.map((p) => p.title)).toEqual(["New Book"]);
  });

  it("keeps at most two books per author", () => {
    const docs = ["a", "b", "c"].map((t) => doc(t, `Title ${t}`));
    expect(pickRecommendations([{ query, docs }], [], noShuffle)).toHaveLength(2);
  });
});

describe("curateChart", () => {
  it("keeps one entry per title, two per author, and requires a cover", () => {
    const docs = [
      doc("1", "Fantasy One", { subject: ["Fantasy"], language: ["eng"] }),
      doc("2", "Fantasy One", { subject: ["Fantasy"] }),
      doc("3", "Fantasy Two", { subject: ["Fantasy"] }),
      doc("4", "Fantasy Three", { subject: ["Fantasy"] }),
      doc("5", "Fantasy Four", { subject: ["Fantasy"], author_name: ["B"], cover_i: undefined }),
    ];
    expect(curateChart(docs, "fantasy").map((d) => d.key)).toEqual(["1", "3"]);
  });

  it("rejects non-English editions", () => {
    const docs = [doc("1", "Un libro", { subject: ["Fantasy"], language: ["spa"] })];
    expect(curateChart(docs, "fantasy")).toEqual([]);
  });
});

describe("shuffled", () => {
  it("returns a permutation without changing the input", () => {
    const input = [1, 2, 3, 4];
    const out = shuffled(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});
