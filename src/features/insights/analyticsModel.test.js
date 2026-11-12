import { describe, expect, it } from "vitest";
import { normalizeBook } from "../../domain/book";
import { ALL_TIME, computeInsights, daysToRead, goalProgress, reportYears } from "./analyticsModel";

const day = (y, m, d) => new Date(y, m, d).getTime();
const books = [
  normalizeBook({ id: "a", title: "A", author: "Ann", status: "done", pages: 300, currentPage: 300, rating: 5, startedAt: day(2025, 2, 1), finishedAt: day(2025, 2, 10), tags: ["fantasy epic"] }),
  normalizeBook({ id: "b", title: "B", author: "Ann", status: "reading", pages: 500, currentPage: 120, rating: 3, tags: ["Fantasy Epic", "history"] }),
  normalizeBook({ id: "c", title: "C", author: "Bo", status: "done", pages: 100, currentPage: 100, finishedAt: day(2024, 0, 1), tags: ["fantasy epic"] }),
  normalizeBook({ id: "d", title: "ಕರ್ವಾಲೋ", author: "Bo", status: "done", pages: 200, currentPage: 200, rating: 4, startedAt: day(2025, 5, 1), finishedAt: day(2025, 5, 3) }),
  normalizeBook({ id: "e", title: "E", status: "want", favorite: true }),
];

describe("reportYears", () => {
  it("lists years with finished books, newest first, always including this year", () => {
    expect(reportYears(books, new Date(2026, 0, 5))).toEqual([2026, 2025, 2024]);
  });
});

describe("daysToRead", () => {
  it("counts days between start and finish, and is null without both dates", () => {
    expect(daysToRead(books[0])).toBe(9);
    expect(daysToRead(books[2])).toBeNull();
  });
});

describe("computeInsights", () => {
  const year = computeInsights(books, 2025);

  it("only counts books finished in the chosen year", () => {
    expect(year.finishedCount).toBe(2);
    expect(year.pages).toBe(500);
    expect(year.averagePages).toBe(250);
  });

  it("places finishes by month, as books and pages", () => {
    expect(year.monthlyBooks[2]).toBe(1);
    expect(year.monthlyBooks[5]).toBe(1);
    expect(year.monthlyPages[2]).toBe(300);
    expect(year.busiestMonth).toBe(2);
  });

  it("averages ratings and fills the histogram", () => {
    expect(year.averageRating).toBe("4.5");
    expect(year.ratingHistogram.find((row) => row.stars === 5).count).toBe(1);
    expect(year.ratingHistogram.find((row) => row.stars === 4).count).toBe(1);
  });

  it("finds records", () => {
    expect(year.records.longest.id).toBe("a");
    expect(year.records.shortest.id).toBe("d");
    expect(year.records.topRated.id).toBe("a");
    expect(year.records.fastest.book.id).toBe("d");
    expect(year.records.slowest.days).toBe(9);
  });

  it("ranks authors and mixes scripts", () => {
    expect(year.authors[0][1]).toBe(1);
    expect(year.scripts.map((s) => s.key).sort()).toEqual(["kn", "latin"]);
  });

  it("covers everything ever finished for ALL_TIME", () => {
    const all = computeInsights(books, ALL_TIME);
    expect(all.finishedCount).toBe(3);
    expect(all.genres[0]).toEqual(["Fantasy Epic", 2]);
  });

  it("reports library-wide counts regardless of the year", () => {
    expect(year.library).toEqual({ total: 5, reading: 1, want: 1, favorites: 1 });
  });

  it("handles an empty library", () => {
    const empty = computeInsights([], 2025);
    expect(empty).toMatchObject({ finishedCount: 0, pages: 0, averageRating: "0.0", genres: [], busiestMonth: -1 });
    expect(empty.records.longest).toBeNull();
    expect(empty.profile.id).toBe("newcomer");
  });

  it("names a reader profile", () => {
    expect(computeInsights(books, 2025).profile.id).toBe("explorer");
    expect(computeInsights(books, ALL_TIME).profile).toEqual({ id: "devotee", detail: "Fantasy Epic" });
    const big = [1, 2, 3].map((n) => normalizeBook({ id: `x${n}`, title: `X${n}`, status: "done", pages: 600, finishedAt: day(2025, n, 1) }));
    expect(computeInsights(big, 2025).profile.id).toBe("marathoner");
  });
});

describe("goalProgress", () => {
  it("is capped at 100 and safe for a zero goal", () => {
    expect(goalProgress(6, 12)).toBe(50);
    expect(goalProgress(20, 12)).toBe(100);
    expect(goalProgress(3, 0)).toBe(0);
  });
});
