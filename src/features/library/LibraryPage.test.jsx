// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../domain/book";
import { computeLibraryStats } from "../../domain/library";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";

const many = Array.from({ length: 30 }, (_, i) =>
  normalizeBook({
    id: `b${i}`,
    title: `Book ${String(i).padStart(2, "0")}`,
    author: i % 2 ? "Even Author" : "Odd Author",
    pages: 100 + i,
    currentPage: i === 0 ? 40 : 0,
    status: i === 0 ? "reading" : "want",
    favorite: i === 1,
    addedAt: 1000 - i, // Book 00 is the newest
  })
);

const state = { books: many, loading: false };
const ui = { openNewBook: vi.fn(), openDetails: vi.fn(), openEditBook: vi.fn(), openDeleteConfirm: vi.fn() };
const updateBook = vi.fn();

vi.mock("../../app/AppContext", () => ({
  useBooks: () => ({ books: state.books, booksLoading: state.loading, updateBook }),
  useUi: () => ui,
  useShelves: () => ({ uniqueShelves: ["Classics", "Sci-Fi"] }),
}));

const { default: LibraryPage } = await import("./LibraryPage");

const renderPage = (view = "all") =>
  render(
    <LanguageProvider>
      <LibraryPage view={view} stats={computeLibraryStats(state.books)} onClearView={vi.fn()} />
    </LanguageProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.books = many;
  state.loading = false;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("paging", () => {
  it("shows 12 tiles per page, newest first, with a summary and page buttons", () => {
    renderPage();
    const tiles = document.querySelectorAll(".pk-tile");
    expect(tiles).toHaveLength(12);
    expect(within(tiles[0]).getByText("Book 00")).toBeTruthy();
    expect(screen.getByText("Showing 1–12 of 30 books")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Previous page" }).disabled).toBe(true);
  });

  it("moves to the next page and back, and returns to page 1 when the search changes", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 13–24 of 30 books")).toBeTruthy();
    expect(screen.getByText("Book 12")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(document.querySelectorAll(".pk-tile")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Next page" }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Filter library"), { target: { value: "Even" } });
    expect(screen.getByText("Showing 1–12 of 15 books")).toBeTruthy();
  });

  it("uses a different page size per layout", () => {
    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "List View" }));
    expect(document.querySelectorAll(".pk-row")).toHaveLength(10);
    fireEvent.click(screen.getByRole("radio", { name: "Shelf View" }));
    expect(document.querySelectorAll(".pk-spine")).toHaveLength(30);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });
});

describe("layouts", () => {
  it("lists spines as accessible buttons that open the book", () => {
    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "Shelf View" }));
    expect(screen.getByRole("radio", { name: "Shelf View" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Open Book 05" }));
    expect(ui.openDetails).toHaveBeenCalledWith(expect.objectContaining({ id: "b5" }));
  });

  it("shows progress only for books being read", () => {
    renderPage();
    // "Book 00" also appears in the side panel's "Reading Now" list, so look inside the grid.
    const grid = within(document.querySelector(".pk-tiles"));
    const reading = grid.getByText("Book 00").closest(".pk-tile");
    expect(within(reading).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");
    expect(within(reading).getByText(/40 \/ 100 pages/)).toBeTruthy();
    expect(within(grid.getByText("Book 02").closest(".pk-tile")).queryByRole("progressbar")).toBeNull();
  });

  it("marks favourites", () => {
    renderPage();
    expect(within(screen.getByText("Book 01").closest(".pk-tile")).getByTitle("Favorite")).toBeTruthy();
  });
});

describe("book actions", () => {
  const tile = () => screen.getByText("Book 03").closest(".pk-tile");

  it("toggles favourite", () => {
    renderPage();
    const button = within(tile()).getByRole("button", { name: "Toggle favorite" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(updateBook).toHaveBeenCalledWith("b3", { favorite: true });
  });

  it("opens edit and delete", () => {
    renderPage();
    fireEvent.click(within(tile()).getByRole("button", { name: "Edit book details" }));
    expect(ui.openEditBook).toHaveBeenCalledWith(expect.objectContaining({ id: "b3" }));
    fireEvent.click(within(tile()).getByRole("button", { name: "Remove book" }));
    expect(ui.openDeleteConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: "b3" }));
  });

  it("adds a book to a shelf, creates a new one, and closes with Escape", () => {
    renderPage();
    fireEvent.click(within(tile()).getByRole("button", { name: "Add to shelf" }));
    const popover = screen.getByRole("dialog", { name: "Add to Collections" });
    fireEvent.click(within(popover).getByRole("checkbox", { name: "Classics" }));
    expect(updateBook).toHaveBeenCalledWith("b3", { shelves: ["Classics"] });

    fireEvent.change(within(popover).getByLabelText("New shelf..."), { target: { value: "Summer" } });
    fireEvent.submit(within(popover).getByLabelText("New shelf...").closest("form"));
    expect(updateBook).toHaveBeenCalledWith("b3", { shelves: ["Summer"] });

    fireEvent.keyDown(popover, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("loading and empty states", () => {
  it("shows placeholder tiles while loading", () => {
    state.loading = true;
    renderPage();
    expect(screen.getByRole("status", { name: "Loading your library…" })).toBeTruthy();
    expect(document.querySelectorAll(".pk-tile--skeleton").length).toBeGreaterThan(0);
    expect(document.querySelector(".pk-pagination")).toBeNull();
  });

  it("invites the first book when the library is empty", () => {
    state.books = [];
    renderPage();
    expect(screen.getByRole("heading", { name: "Your shelf is empty" })).toBeTruthy();
    expect(screen.queryByText("Reset filters")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add Book" }));
    expect(ui.openNewBook).toHaveBeenCalled();
  });

  it("offers a reset when filters hide everything", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Filter library"), { target: { value: "no such book" } });
    expect(screen.getByRole("heading", { name: "No books match this view" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByLabelText("Filter library").value).toBe("");
  });

  it("clears the search with the clear button", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Filter library"), { target: { value: "Even" } });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByLabelText("Filter library").value).toBe("");
  });
});
