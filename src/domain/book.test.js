import { describe, expect, it } from "vitest";
import {
  changedFields,
  contentKey,
  createBookFromForm,
  findNewBooks,
  normalizeBook,
  parseLedger,
  reconcileBookStatus,
} from "./book";

describe("reconcileBookStatus", () => {
  it("promotes a book to done on its last page", () => {
    const book = reconcileBookStatus({ status: "reading", pages: 100, currentPage: 100 }, 1000);
    expect(book.status).toBe("done");
    expect(book.finishedAt).toBe(1000);
  });

  it("promotes want to reading once progress starts", () => {
    const book = reconcileBookStatus({ status: "want", pages: 100, currentPage: 10 }, 1000);
    expect(book.status).toBe("reading");
    expect(book.startedAt).toBe(1000);
  });

  it("resets progress and dates for want", () => {
    const book = reconcileBookStatus(
      { status: "want", pages: 100, currentPage: 0, startedAt: 5, finishedAt: 9 },
      1000
    );
    expect(book).toMatchObject({ currentPage: 0, startedAt: null, finishedAt: null });
  });

  it("fills progress for done and clears finishedAt when reopened", () => {
    expect(reconcileBookStatus({ status: "done", pages: 50, currentPage: 3 }).currentPage).toBe(50);
    expect(reconcileBookStatus({ status: "reading", pages: 50, currentPage: 3, finishedAt: 9 }).finishedAt).toBeNull();
  });

  it("never invents timestamps when only reading stored data", () => {
    const book = reconcileBookStatus({ status: "done", pages: 50, currentPage: 50 });
    expect(book.finishedAt).toBeNull();
  });

  it("keeps an existing finishedAt even when stamping", () => {
    const book = reconcileBookStatus({ status: "done", pages: 50, currentPage: 50, finishedAt: 42 }, 1000);
    expect(book.finishedAt).toBe(42);
  });

  it("falls back to want for unknown statuses and clamps progress", () => {
    expect(reconcileBookStatus({ status: "bogus" }).status).toBe("want");
    expect(reconcileBookStatus({ status: "reading", pages: 10, currentPage: 99 }).status).toBe("done");
  });
});

describe("normalizeBook", () => {
  it("fills defaults and never produces undefined fields (Firestore rejects them)", () => {
    const book = normalizeBook({ title: " Dune " });
    expect(book.title).toBe("Dune");
    expect(Object.values(book).some((v) => v === undefined)).toBe(false);
  });

  it("accepts comma separated lists", () => {
    const book = normalizeBook({ title: "x", tags: "a, b,,c", shelves: ["s1", " "] });
    expect(book.tags).toEqual(["a", "b", "c"]);
    expect(book.shelves).toEqual(["s1"]);
  });

  it("does not change updatedAt or dates when merely loading", () => {
    const book = normalizeBook({ title: "x", status: "done", pages: 10, currentPage: 10, updatedAt: 7 });
    expect(book.updatedAt).toBe(7);
    expect(book.finishedAt).toBeNull();
  });

  it("stamps updatedAt and transitions when saving", () => {
    const book = normalizeBook({ title: "x", status: "done", pages: 10, currentPage: 10, updatedAt: 7 }, { stamp: true });
    expect(book.updatedAt).toBeGreaterThan(7);
    expect(book.finishedAt).not.toBeNull();
  });
});

describe("createBookFromForm", () => {
  it("keeps fields the form does not edit", () => {
    const existing = normalizeBook({ id: "b1", title: "Old", favorite: true, addedAt: 5 });
    const book = createBookFromForm({ title: "New" }, existing);
    expect(book).toMatchObject({ id: "b1", title: "New", favorite: true, addedAt: 5 });
  });
});

describe("import", () => {
  const backup = JSON.stringify({
    books: [{ title: "Dune", author: "Herbert" }, { title: "Emma", author: "Austen", id: "keep" }, null, 7],
  });

  it("parses wrapped and bare arrays, skipping junk entries", () => {
    expect(parseLedger(backup)).toHaveLength(2);
    expect(parseLedger(JSON.stringify([{ title: "A" }]))).toHaveLength(1);
  });

  it("rejects files that are not a ledger", () => {
    expect(() => parseLedger("not json")).toThrow();
    expect(() => parseLedger(JSON.stringify({ foo: 1 }))).toThrow();
  });

  it("gives id-less books a stable id so re-importing is idempotent", () => {
    const first = parseLedger(backup);
    const second = parseLedger(backup);
    expect(first[0].id).toBe(second[0].id);
    expect(findNewBooks(first, second)).toEqual([]);
  });

  it("dedupes by id and by content", () => {
    const existing = [normalizeBook({ id: "a", title: "Dune", author: "Herbert" })];
    const incoming = [
      normalizeBook({ id: "z", title: "dune", author: "HERBERT" }), // same content
      normalizeBook({ id: "a", title: "Other" }), // same id
      normalizeBook({ id: "n", title: "New" }),
      normalizeBook({ id: "n2", title: "New" }), // duplicate inside the file
    ];
    expect(findNewBooks(existing, incoming).map((b) => b.id)).toEqual(["n"]);
  });

  it("prefers source key, then isbn, for identity", () => {
    expect(contentKey({ sourceKey: "k", isbn: "1", title: "t" })).toBe("src:k");
    expect(contentKey({ isbn: "1", title: "t" })).toBe("isbn:1");
  });
});

describe("editing with the previous copy (explicit choices win)", () => {
  const done = normalizeBook({ id: "d", title: "Dune", status: "done", pages: 400, currentPage: 400, finishedAt: 5, startedAt: 1 });
  const reading = normalizeBook({ id: "r", title: "Emma", status: "reading", pages: 200, currentPage: 90 });

  const edit = (previous, changes) => normalizeBook({ ...previous, ...changes }, { stamp: true, previous });

  it("lets a finished book be set back to Reading, restarting from the beginning", () => {
    const next = edit(done, { status: "reading" });
    expect(next.status).toBe("reading");
    expect(next.currentPage).toBe(1);
    expect(next.finishedAt).toBeNull();
    expect(next.startedAt).toBe(1); // when it was first started is kept
  });

  it("lets a book you are reading be set back to Want to read, resetting progress", () => {
    const next = edit(reading, { status: "want" });
    expect(next).toMatchObject({ status: "want", currentPage: 0, startedAt: null });
  });

  it("lets a finished book be set to Want to read", () => {
    expect(edit(done, { status: "want" })).toMatchObject({ status: "want", currentPage: 0, finishedAt: null });
  });

  it("treats lowering the page of a finished book as reading it again", () => {
    const next = edit(done, { currentPage: 100 });
    expect(next).toMatchObject({ status: "reading", currentPage: 100, finishedAt: null });
  });

  it("still finishes a book when the last page is reached", () => {
    const next = edit(reading, { currentPage: 200 });
    expect(next).toMatchObject({ status: "done", currentPage: 200 });
    expect(next.finishedAt).not.toBeNull();
  });

  it("still promotes a want book once you turn a page", () => {
    const want = normalizeBook({ id: "w", title: "Kim", status: "want", pages: 300 });
    expect(edit(want, { currentPage: 12 })).toMatchObject({ status: "reading", currentPage: 12 });
  });

  it("does not demote a finished book when only other fields change (e.g. enrichment adds pages)", () => {
    const noPages = normalizeBook({ id: "n", title: "Old", status: "done", pages: 0, currentPage: 0, finishedAt: 5 });
    const next = edit(noPages, { pages: 250 });
    expect(next).toMatchObject({ status: "done", currentPage: 250, finishedAt: 5 });
    expect(edit(done, { rating: 4 })).toMatchObject({ status: "done", currentPage: 400 });
  });

  it("does not demote when the total is raised on a finished book", () => {
    expect(edit(done, { pages: 500 })).toMatchObject({ status: "done", currentPage: 500 });
  });

  it("an explicit status wins even if the page would suggest otherwise", () => {
    expect(edit(reading, { status: "done" })).toMatchObject({ status: "done", currentPage: 200 });
    expect(edit(reading, { status: "want", currentPage: 120 })).toMatchObject({ status: "want", currentPage: 0 });
  });

  it("without a previous copy the old inference still applies (loading and importing)", () => {
    expect(normalizeBook({ title: "x", status: "want", pages: 100, currentPage: 30 }).status).toBe("reading");
    expect(normalizeBook({ title: "x", status: "reading", pages: 100, currentPage: 100 }).status).toBe("done");
  });

  it("createBookFromForm uses the stored copy so form edits behave the same", () => {
    const next = createBookFromForm({ ...done, status: "reading" }, done);
    expect(next.status).toBe("reading");
    const fresh = createBookFromForm({ title: "New", status: "want", pages: "100", currentPage: "30" });
    expect(fresh.status).toBe("reading"); // a brand-new book is still inferred
  });
});

describe("changedFields", () => {
  it("returns only what differs, comparing arrays by value", () => {
    const before = { id: "1", title: "A", tags: ["x"], rating: 3, notes: null };
    const after = { id: "1", title: "A", tags: ["x"], rating: 4, notes: "hi", extra: 1 };
    expect(changedFields(before, after)).toEqual({ rating: 4, notes: "hi", extra: 1 });
    expect(changedFields(before, { ...before, tags: ["x", "y"] })).toEqual({ tags: ["x", "y"] });
  });

  it("treats null and undefined as the same, and finds nothing when identical", () => {
    expect(changedFields({ a: null }, { a: undefined })).toEqual({});
    const book = normalizeBook({ id: "z", title: "Same" });
    expect(changedFields(book, { ...book })).toEqual({});
  });
});
