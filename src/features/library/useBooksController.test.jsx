// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../domain/book";

const setDocMock = vi.fn();
const deleteDocMock = vi.fn();
const state = { docs: [] };

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "books-collection"),
  doc: vi.fn((_db, ...path) => ({ path: path.join("/") })),
  orderBy: vi.fn(),
  query: vi.fn((c) => c),
  writeBatch: vi.fn(),
  setDoc: (...args) => setDocMock(...args),
  deleteDoc: (...args) => deleteDocMock(...args),
  onSnapshot: (_query, onNext) => {
    onNext({ docs: state.docs.map((book) => ({ id: book.id, data: () => book })) });
    return () => {};
  },
}));
vi.mock("../../services/firebase", () => ({ db: {} }));
vi.mock("../../services/enrichment", () => ({
  buildUpdates: () => ({}),
  lookupDetails: async () => null,
  needsEnrichment: () => false,
}));
// Real needsCover / CoverSearchIncomplete; only the network search is faked. Off unless a test turns it on.
const covers = { enabled: false, find: vi.fn() };
vi.mock("../../services/coverSearch", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    needsCover: (book) => covers.enabled && real.needsCover(book),
    findBestCover: (...args) => covers.find(...args),
  };
});
const { CoverSearchIncomplete } = await import("../../services/coverSearch");

const { useBooksController } = await import("./useBooksController");

const user = { uid: "u1" };
const stored = (extra) => ({ ...normalizeBook({ id: "d1", title: "Dune", author: "Herbert", status: "done", pages: 400, currentPage: 400, finishedAt: 5, ...extra }) });

async function setup(docs = [stored()]) {
  state.docs = docs;
  const notify = vi.fn();
  const hook = renderHook(() => useBooksController(user, notify));
  await waitFor(() => expect(hook.result.current.books).toHaveLength(docs.length));
  return { ...hook, notify };
}

beforeEach(() => {
  vi.clearAllMocks();
  covers.enabled = false;
  setDocMock.mockResolvedValue(undefined);
  deleteDocMock.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("updateBook", () => {
  it("writes only the fields that changed, not the whole (possibly stale) book", async () => {
    const { result } = await setup();
    await act(() => result.current.updateBook("d1", { rating: 4 }));
    const [, data, options] = setDocMock.mock.calls[0];
    expect(options).toEqual({ merge: true });
    expect(data).toMatchObject({ rating: 4 });
    expect(data).not.toHaveProperty("title");
    expect(data).not.toHaveProperty("status");
  });

  it("two quick edits to different fields do not overwrite each other", async () => {
    const { result } = await setup([stored({ status: "reading", currentPage: 100, finishedAt: null })]);
    await act(async () => {
      await Promise.all([result.current.updateBook("d1", { currentPage: 150 }), result.current.updateBook("d1", { notes: "Great." })]);
    });
    const [pagesWrite, notesWrite] = setDocMock.mock.calls.map((call) => call[1]);
    expect(pagesWrite).toMatchObject({ currentPage: 150 });
    expect(pagesWrite).not.toHaveProperty("notes");
    expect(notesWrite).toMatchObject({ notes: "Great." });
    expect(notesWrite).not.toHaveProperty("currentPage"); // would have reverted the pages
  });

  it("stores an explicit status choice (finished -> reading) instead of snapping back", async () => {
    const { result } = await setup();
    await act(() => result.current.updateBook("d1", { status: "reading" }));
    expect(setDocMock.mock.calls[0][1]).toMatchObject({ status: "reading", currentPage: 1, finishedAt: null });
  });

  it("does nothing for a book that does not exist", async () => {
    const { result } = await setup();
    await expect(result.current.updateBook("missing", { rating: 1 })).resolves.toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("quickAdd", () => {
  const form = { title: "Karvalo", author: "Tejaswi", sourceKey: "gb-1", status: "want" };

  it("adds a book once even when triggered twice before the first finishes (double click)", async () => {
    const { result, notify } = await setup([]);
    let release;
    setDocMock.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    let first, second;
    await act(async () => {
      first = result.current.quickAdd(form);
      second = result.current.quickAdd(form);
      release();
      await Promise.all([first, second]);
    });
    expect(setDocMock).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBe(false);
    expect(notify).toHaveBeenCalledWith("That book is already in your library.");
  });

  it("does not add a book that is already in the library, matched by source or by title and author", async () => {
    const { result } = await setup([stored({ id: "k", title: "Karvalo", author: "Tejaswi", sourceKey: "gb-1" })]);
    await act(() => result.current.quickAdd(form));
    await act(() => result.current.quickAdd({ title: "karvalo", author: "TEJASWI" }));
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("adds a book that is not in the library yet", async () => {
    const { result } = await setup([]);
    await act(() => result.current.quickAdd(form));
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });
});

describe("saving without hanging or losing the outcome", () => {
  it("reports success once the server confirms", async () => {
    const { result, notify } = await setup([]);
    let saved;
    await act(async () => {
      saved = await result.current.submitBook(null, { title: "New", status: "want" });
    });
    expect(saved).toBe(true);
    expect(notify).toHaveBeenCalledWith("Book added to shelf.");
  });

  it("does not hang when offline: it resolves as saved on this device", async () => {
    const { result, notify } = await setup([]);
    vi.useFakeTimers(); // after setup, which waits on real timers
    setDocMock.mockReturnValue(new Promise(() => {})); // the server never answers
    let saved;
    const pending = act(async () => {
      const promise = result.current.submitBook(null, { title: "Offline", status: "want" });
      await vi.advanceTimersByTimeAsync(5100);
      saved = await promise;
    });
    await pending;
    expect(saved).toBe(true);
    expect(notify).toHaveBeenCalledWith("Saved on this device. It will sync when you are back online.");
  });

  it("tells you, and returns false, when the save is rejected", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, notify } = await setup([]);
    setDocMock.mockRejectedValue(new Error("permission-denied"));
    let saved;
    await act(async () => {
      saved = await result.current.submitBook(null, { title: "Nope", status: "want" });
    });
    expect(saved).toBe(false);
    expect(notify).toHaveBeenCalledWith("Sync failed.", "error");
    expect(result.current.saveError).toBeTruthy();
  });

  it("will not save a book without a title", async () => {
    const { result } = await setup([]);
    await expect(result.current.submitBook(null, { title: "   " })).resolves.toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("deletes with a confirmation message, and reports a failed delete", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, notify } = await setup();
    await act(() => result.current.deleteBook({ id: "d1" }));
    expect(notify).toHaveBeenCalledWith("Book removed from shelf.");
    deleteDocMock.mockRejectedValue(new Error("nope"));
    await act(() => result.current.deleteBook({ id: "d1" }));
    expect(notify).toHaveBeenLastCalledWith("Failed to delete book.", "error");
  });
});

describe("automatic covers", () => {
  const coverless = (extra) => stored({ coverUrl: "", ...extra });
  const writes = () => setDocMock.mock.calls.map((call) => call[1]);

  it("saves the cover found online, with its source and when it was checked", async () => {
    covers.enabled = true;
    covers.find.mockResolvedValue({ url: "https://upload.wikimedia.org/parva.jpg", source: "wikipedia" });
    await setup([coverless()]);
    await waitFor(() => expect(setDocMock).toHaveBeenCalled(), { timeout: 4000 });
    expect(writes()[0]).toMatchObject({ coverUrl: "https://upload.wikimedia.org/parva.jpg", coverSource: "wikipedia" });
    expect(Date.parse(writes()[0].coverCheckedAt)).not.toBeNaN();
  });

  it("stamps a miss so the book is not searched again every visit", async () => {
    covers.enabled = true;
    covers.find.mockResolvedValue(null);
    await setup([coverless()]);
    await waitFor(() => expect(setDocMock).toHaveBeenCalled(), { timeout: 4000 });
    expect(writes()[0]).toHaveProperty("coverCheckedAt");
    expect(writes()[0]).not.toHaveProperty("coverUrl");
  });

  it("writes nothing when a source could not be reached, so a later visit retries", async () => {
    covers.enabled = true;
    covers.find.mockRejectedValue(new CoverSearchIncomplete());
    await setup([coverless()]);
    await waitFor(() => expect(covers.find).toHaveBeenCalled(), { timeout: 4000 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("leaves alone a book whose cover the reader removed, or that was checked recently", async () => {
    covers.enabled = true;
    await setup([
      coverless({ id: "removed", coverSource: "removed" }),
      coverless({ id: "recent", title: "Emma", coverCheckedAt: new Date().toISOString() }),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(covers.find).not.toHaveBeenCalled();
  });
});
