// @vitest-environment jsdom
/**
 * Render smoke test for the signed-in app. Firebase is replaced by a fake
 * context, so this checks the wiring between the split components (props,
 * routing, lazy pages) rather than any network or database behaviour.
 */
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../domain/book";

const books = [
  normalizeBook({ id: "1", title: "Dune", author: "Frank Herbert", status: "done", pages: 400, currentPage: 400, rating: 5, favorite: true, tags: ["Sci-Fi"], shelves: ["Classics"], finishedAt: Date.now() }),
  normalizeBook({ id: "2", title: "Emma", author: "Jane Austen", status: "reading", pages: 200, currentPage: 50, tags: ["Romance"] }),
  normalizeBook({ id: "3", title: "Kim", author: "Rudyard Kipling", status: "want" }),
];

const ui = { openNewBook: vi.fn(), openDetails: vi.fn(), openEditBook: vi.fn(), openDeleteConfirm: vi.fn(), closeDetails: vi.fn(), closeDeleteConfirm: vi.fn() };

vi.mock("./AppContext", () => ({
  useAuth: () => ({ user: { uid: "u", displayName: "Test Reader", email: "t@example.com" }, signOut: vi.fn() }),
  useBooks: () => ({ books, booksLoading: false, exportLedger: vi.fn(), importLedger: vi.fn(), updateBook: vi.fn(), deleteBook: vi.fn() }),
  useShelves: () => ({ uniqueShelves: ["Classics"], shelfBooks: { Classics: [books[0]] }, getPreset: () => ({ class: "x", color: "#000" }), renameShelf: vi.fn(), deleteShelf: vi.fn() }),
  useUi: () => ui,
  useModal: () => ({ open: false, quickAdd: vi.fn() }),
  useToast: () => ({ toast: "", toastType: "success" }),
  useApp: () => ({ deleteConfirmBook: null, detailsBook: null }),
}));

const { default: Workspace } = await import("./Workspace");

function renderAt(path) {
  window.history.replaceState(null, "", path);
  return render(<Workspace />);
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("Workspace", () => {
  it("shows the library with every book, stats and the sidebar", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "My Library" })).toBeTruthy();
    ["Dune", "Emma", "Kim"].forEach((title) => expect(screen.getAllByText(title).length).toBeGreaterThan(0));
    expect(screen.getByLabelText("Shelf stats summary")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Shelf navigation" })).toBeTruthy();
  });

  it("filters by status from the URL", () => {
    renderAt("/reading");
    const grid = document.querySelector(".book-grid");
    expect(within(grid).getByText("Emma")).toBeTruthy();
    expect(within(grid).queryByText("Dune")).toBeNull();
  });

  it("filters by shelf and titles the page after it", () => {
    renderAt("/" + encodeURIComponent("shelf:Classics"));
    expect(screen.getByRole("heading", { name: "Shelf: Classics" })).toBeTruthy();
    expect(within(document.querySelector(".book-grid")).queryByText("Emma")).toBeNull();
  });

  it("searches the library and offers a reset when nothing matches", () => {
    renderAt("/");
    fireEvent.change(screen.getByLabelText("Filter library"), { target: { value: "zzz-nothing" } });
    expect(screen.getByText("No books match this view")).toBeTruthy();
    fireEvent.click(screen.getByText("Reset filters"));
    expect(screen.getAllByText("Dune").length).toBeGreaterThan(0);
  });

  it("switches between grid and list layouts", () => {
    renderAt("/");
    fireEvent.click(screen.getByLabelText("List View"));
    expect(document.querySelector(".book-list")).toBeTruthy();
    expect(document.querySelector(".book-card.row")).toBeTruthy();
  });

  it("opens the add-book dialog and book details through the ui actions", () => {
    renderAt("/");
    fireEvent.click(screen.getAllByText("Add Book")[0]);
    expect(ui.openNewBook).toHaveBeenCalled();
    fireEvent.click(screen.getAllByText("Dune")[0]);
    expect(ui.openDetails).toHaveBeenCalled();
  });

  it("navigates to a lazy page from the sidebar", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: /Insights/ }));
    expect(await screen.findByText("Total Books Completed")).toBeTruthy();
    expect(window.location.pathname).toBe("/analytics");
    expect(screen.queryByLabelText("Shelf stats summary")).toBeNull();
  });

  it("falls back to the library for an unknown URL", () => {
    renderAt("/definitely-not-a-page");
    expect(screen.getByRole("heading", { name: "My Library" })).toBeTruthy();
  });

  it("renders the knowledge galaxy", async () => {
    renderAt("/galaxy");
    expect(await screen.findByPlaceholderText("Search books...")).toBeTruthy();
    expect(document.querySelectorAll(".galaxy-canvas circle").length).toBeGreaterThanOrEqual(3);
  });
});
