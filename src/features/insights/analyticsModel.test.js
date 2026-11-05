import { describe, expect, it } from "vitest";
import { normalizeBook } from "../../domain/book";
import { RING_CIRCUMFERENCE, buildDonutSlices, computeAnalytics, goalProgress } from "./analyticsModel";

const finishedAt = new Date(2025, 2, 10).getTime(); // March 2025
const books = [
  normalizeBook({ id: "a", title: "A", status: "done", pages: 300, currentPage: 300, rating: 5, finishedAt, tags: ["fantasy epic"] }),
  normalizeBook({ id: "b", title: "B", status: "reading", pages: 500, currentPage: 120, rating: 3, tags: ["Fantasy Epic", "history"] }),
  normalizeBook({ id: "c", title: "C", status: "done", pages: 100, currentPage: 100, finishedAt: new Date(2024, 0, 1).getTime() }),
];

describe("computeAnalytics", () => {
  const stats = computeAnalytics(books, 2025);

  it("totals pages, completions and average rating", () => {
    expect(stats.pagesRead).toBe(300 + 120 + 100);
    expect(stats.completedCount).toBe(2);
    expect(stats.completedThisYear).toBe(1);
    expect(stats.averageRating).toBe("4.0");
  });

  it("places completions in the right month and year only", () => {
    expect(stats.monthlyCompletions[2]).toBe(1);
    expect(stats.monthlyCompletions.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("finds the thickest and highest rated books", () => {
    expect(stats.thickestBook.id).toBe("b");
    expect(stats.highestRated.id).toBe("a");
  });

  it("merges genre spellings and title-cases them", () => {
    expect(stats.topGenres[0]).toEqual(["Fantasy Epic", 2]);
  });

  it("handles an empty library", () => {
    expect(computeAnalytics([], 2025)).toMatchObject({ pagesRead: 0, averageRating: "0.0", thickestBook: null, topGenres: [] });
  });
});

describe("goalProgress", () => {
  it("is capped at 100 and safe for a zero goal", () => {
    expect(goalProgress(6, 12)).toBe(50);
    expect(goalProgress(20, 12)).toBe(100);
    expect(goalProgress(3, 0)).toBe(0);
  });
});

describe("buildDonutSlices", () => {
  it("splits the ring in proportion and lays slices end to end", () => {
    const slices = buildDonutSlices([["A", 3], ["B", 1]]);
    expect(slices.map((s) => s.percent)).toEqual([75, 25]);
    expect(slices[0].strokeDashoffset).toBeCloseTo(RING_CIRCUMFERENCE);
    expect(slices[1].strokeDashoffset).toBeCloseTo(RING_CIRCUMFERENCE * 0.25);
  });

  it("returns nothing without data", () => {
    expect(buildDonutSlices([])).toEqual([]);
  });
});
