import { describe, expect, it } from "vitest";
import { finishedByMonth } from "./library";

const at = (y, m, d = 10) => new Date(y, m, d).getTime();

describe("finishedByMonth", () => {
  it("groups this year's finished books by the month they were finished", () => {
    const books = [
      { id: "a", status: "done", finishedAt: at(2026, 0) },
      { id: "b", status: "done", finishedAt: at(2026, 0, 28) },
      { id: "c", status: "done", finishedAt: at(2026, 10) },
      { id: "d", status: "done", finishedAt: at(2025, 10) }, // last year
      { id: "e", status: "reading", finishedAt: at(2026, 3) }, // not finished
      { id: "f", status: "done" }, // no date
    ];
    const months = finishedByMonth(books, 2026);
    expect(months).toHaveLength(12);
    expect(months[0].map((b) => b.id)).toEqual(["a", "b"]);
    expect(months[10].map((b) => b.id)).toEqual(["c"]);
    expect(months.flat()).toHaveLength(3);
  });
});
