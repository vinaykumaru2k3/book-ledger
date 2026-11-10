// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../domain/book";

const searchOpenLibrary = vi.fn();
vi.mock("../../services/bookApi", async () => ({
  ...(await vi.importActual("../../services/bookApi")),
  searchOpenLibrary: (...args) => searchOpenLibrary(...args),
}));

const { useRecommendations } = await import("./useRecommendations");

const doc = (key, title, author = "Other Author") => ({ key, title, author_name: [author], cover_i: 1 });
const lib = (extra = []) => [normalizeBook({ id: "1", title: "Emma", author: "Jane Austen", tags: ["Classics"] }), ...extra];

beforeEach(() => {
  vi.clearAllMocks();
  searchOpenLibrary.mockResolvedValue([doc("w1", "Fresh One"), doc("w2", "Fresh Two", "Someone Else")]);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("useRecommendations", () => {
  it("loads recommendations for the library", async () => {
    const { result } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0));
    expect(searchOpenLibrary).toHaveBeenCalled();
  });

  it("does not refetch or reshuffle when the library changes in ways that do not affect taste", async () => {
    const { result, rerender } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0));
    const calls = searchOpenLibrary.mock.calls.length;
    const before = result.current.recommendations.map((r) => r.id);

    // New array identity, plus a favourite toggled and notes added: taste is unchanged.
    rerender({ books: lib().map((b) => ({ ...b, favorite: true, notes: "n" })) });
    await act(async () => {});
    expect(searchOpenLibrary.mock.calls.length).toBe(calls);
    expect(result.current.recommendations.map((r) => r.id)).toEqual(before);
  });

  it("drops a recommendation you add, and leaves the rest untouched without refetching", async () => {
    // Five established authors (two books each): one more book by a newcomer does not change the top five.
    const established = ["Ann", "Bea", "Cy", "Di", "Ed"].flatMap((author, i) => [
      normalizeBook({ id: `${author}1`, title: `${author} One`, author, tags: ["Classics"] }),
      normalizeBook({ id: `${author}2`, title: `${author} Two`, author, tags: ["Classics"] }),
    ]);
    const { result, rerender } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: established } });
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(1));
    const calls = searchOpenLibrary.mock.calls.length;
    const [first, ...rest] = result.current.recommendations;

    rerender({ books: [...established, normalizeBook({ id: "new", title: first.title, author: first.author, tags: ["Classics"] })] });
    await act(async () => {});
    expect(result.current.recommendations.map((r) => r.id)).toEqual(rest.map((r) => r.id));
    expect(searchOpenLibrary.mock.calls.length).toBe(calls);
  });

  it("fetches again when your taste changes (a new favourite author)", async () => {
    const { result, rerender } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0));
    const calls = searchOpenLibrary.mock.calls.length;

    rerender({ books: lib([normalizeBook({ id: "3", title: "Dune", author: "Frank Herbert", tags: ["Sci-Fi"] })]) });
    await waitFor(() => expect(searchOpenLibrary.mock.calls.length).toBeGreaterThan(calls));
  });

  it("fetches again on refresh()", async () => {
    const { result } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0));
    const calls = searchOpenLibrary.mock.calls.length;
    act(() => result.current.refresh());
    await waitFor(() => expect(searchOpenLibrary.mock.calls.length).toBeGreaterThan(calls));
  });

  it("hides a book you dismiss, and keeps it hidden next time", async () => {
    const { result, unmount } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(result.current.recommendations.length).toBeGreaterThan(0));
    const target = result.current.recommendations[0].id;
    act(() => result.current.dismiss(target));
    expect(result.current.recommendations.some((r) => r.id === target)).toBe(false);
    unmount();

    const again = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(again.result.current.loading).toBe(false));
    expect(again.result.current.recommendations.some((r) => r.id === target)).toBe(false);
  });

  it("reports a failure instead of staying on the loading spinner", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    searchOpenLibrary.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(({ books }) => useRecommendations(books), { initialProps: { books: lib() } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recommendations).toEqual([]);
  });
});
