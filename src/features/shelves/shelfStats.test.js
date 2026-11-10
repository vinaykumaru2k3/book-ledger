import { describe, expect, it } from "vitest";
import { shelfStats, unshelvedBooks } from "./shelfStats";

const books = [
  { id: "1", title: "Dune", status: "done", pages: 400, currentPage: 400, shelves: ["Sci-Fi"] },
  { id: "2", title: "ಪರ್ವ", status: "reading", pages: 200, currentPage: 100, shelves: ["Sci-Fi"] },
  { id: "3", title: "Emma", status: "want", pages: 300, currentPage: 0, shelves: [] },
  { id: "4", title: "Kim", status: "want", pages: 0 },
];

describe("shelfStats", () => {
  it("summarises a shelf", () => {
    expect(shelfStats(books.slice(0, 2))).toEqual({ total: 2, finished: 1, reading: 1, pages: 600, readShare: 75, scripts: 2 });
  });

  it("handles an empty shelf", () => {
    expect(shelfStats([])).toMatchObject({ total: 0, readShare: 0, pages: 0 });
  });

  it("finds books on no shelf", () => {
    expect(unshelvedBooks(books).map((b) => b.id)).toEqual(["3", "4"]);
  });
});
