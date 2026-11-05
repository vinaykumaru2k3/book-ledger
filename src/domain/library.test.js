import { describe, expect, it } from "vitest";
import {
  computeLibraryStats,
  currentlyReading,
  filterAndSortBooks,
  findDuplicate,
  genreLabels,
  isInLibrary,
  paginate,
  recentlyFinished,
  shelvesOf,
} from "./library";
import { normalizeBook } from "./book";

const make = (extra) => normalizeBook({ title: "T", ...extra });
const library = [
  make({ id: "1", title: "Dune", author: "Herbert", status: "done", pages: 400, currentPage: 400, rating: 5, finishedAt: 20, favorite: true, shelves: ["Sci-Fi"], addedAt: 1 }),
  make({ id: "2", title: "Emma", author: "Austen", status: "reading", pages: 200, currentPage: 100, rating: 3, addedAt: 3 }),
  make({ id: "3", title: "Kim", author: "Kipling", status: "want", addedAt: 2, tags: ["Adventure"] }),
];

describe("filterAndSortBooks", () => {
  it("filters by status, favorites and shelf", () => {
    expect(filterAndSortBooks(library, { view: "reading" }).map((b) => b.id)).toEqual(["2"]);
    expect(filterAndSortBooks(library, { view: "favorites" }).map((b) => b.id)).toEqual(["1"]);
    expect(filterAndSortBooks(library, { view: "shelf:Sci-Fi" }).map((b) => b.id)).toEqual(["1"]);
  });

  it("searches title, author and tags", () => {
    expect(filterAndSortBooks(library, { query: "austen" }).map((b) => b.id)).toEqual(["2"]);
    expect(filterAndSortBooks(library, { query: "adventure" }).map((b) => b.id)).toEqual(["3"]);
  });

  it("sorts by the chosen key, defaulting to most recently added", () => {
    expect(filterAndSortBooks(library).map((b) => b.id)).toEqual(["2", "3", "1"]);
    expect(filterAndSortBooks(library, { sortBy: "title" }).map((b) => b.title)).toEqual(["Dune", "Emma", "Kim"]);
    expect(filterAndSortBooks(library, { sortBy: "rating" })[0].id).toBe("1");
    expect(filterAndSortBooks(library, { sortBy: "nonsense" })[0].id).toBe("2");
  });

  it("does not mutate its input", () => {
    const copy = [...library];
    filterAndSortBooks(library, { sortBy: "title" });
    expect(library).toEqual(copy);
  });
});

describe("paginate", () => {
  it("slices and clamps the page", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    expect(paginate(items, 2, 4)).toMatchObject({ items: [4, 5, 6, 7], page: 2, pageCount: 3, start: 4 });
    expect(paginate(items, 99, 4).page).toBe(3);
    expect(paginate([], 1, 4)).toMatchObject({ items: [], page: 1, pageCount: 1 });
  });
});

describe("computeLibraryStats", () => {
  it("counts statuses, pages, ratings and completion", () => {
    const year = new Date(20).getFullYear();
    const stats = computeLibraryStats(library, year);
    expect(stats).toMatchObject({ total: 3, want: 1, reading: 1, done: 1, favorites: 1, finishedThisYear: 1 });
    expect(stats.pagesRead).toBe(500);
    expect(stats.averageRating).toBe("4.0");
    expect(stats.completionRate).toBe(33);
  });

  it("handles an empty library", () => {
    expect(computeLibraryStats([])).toMatchObject({ total: 0, averageRating: "0.0", completionRate: 0 });
  });
});

describe("duplicates", () => {
  it("matches by title and author ignoring case and spacing", () => {
    expect(isInLibrary(library, " dune ", "HERBERT")).toBe(true);
    expect(isInLibrary(library, "Dune", "Someone else")).toBe(false);
  });

  it("prefers the source key and ignores blank title/author", () => {
    const withKey = [make({ id: "k", title: "Other", sourceKey: "abc" })];
    expect(findDuplicate(withKey, { sourceKey: "abc", title: "x", author: "y" }).id).toBe("k");
    expect(findDuplicate(library, { title: "", author: "" })).toBeNull();
  });
});

describe("genres and shelves", () => {
  it("drops state-like tags and lower-cases", () => {
    expect(genreLabels({ genres: ["Fantasy", "General"], tags: ["Reading", " Epic "] })).toEqual(["fantasy", "epic"]);
  });

  it("lists shelves once, sorted", () => {
    expect(shelvesOf([{ shelves: ["b", "a"] }, { shelves: ["a"] }, {}])).toEqual(["a", "b"]);
  });
});

describe("reading lists", () => {
  it("lists in-progress and finished books", () => {
    expect(currentlyReading(library).map((b) => b.id)).toEqual(["2"]);
    expect(recentlyFinished(library).map((b) => b.id)).toEqual(["1"]);
    expect(currentlyReading(library, 0)).toEqual([]);
  });
});
