import { describe, expect, it } from "vitest";
import {
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
