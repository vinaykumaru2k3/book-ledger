// @vitest-environment jsdom
/**
 * Render smoke test for the signed-in app. Firebase is replaced by a fake
 * context, so this checks the wiring between the split components (props,
 * routing, lazy pages, shell) rather than any network or database behaviour.
 */
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../domain/book";
import { LanguageProvider } from "../shared/i18n/LanguageContext";
import { usePathRoute } from "./usePathRoute";

const books = [
  normalizeBook({ id: "1", title: "Dune", author: "Frank Herbert", status: "done", pages: 400, currentPage: 400, rating: 5, favorite: true, tags: ["Sci-Fi"], shelves: ["Classics"], finishedAt: Date.now() }),
  normalizeBook({ id: "2", title: "Emma", author: "Jane Austen", status: "reading", pages: 200, currentPage: 50, tags: ["Romance"] }),
  normalizeBook({ id: "3", title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", status: "want" }),
];

const ui = { openNewBook: vi.fn(), openDetails: vi.fn(), openEditBook: vi.fn(), openDeleteConfirm: vi.fn(), closeDetails: vi.fn(), closeDeleteConfirm: vi.fn() };
const signOut = vi.fn();
const exportLedger = vi.fn();

vi.mock("./AppContext", () => ({
  useAuth: () => ({ user: { uid: "u", displayName: "Test Reader", email: "t@example.com" }, signOut }),
  useBooks: () => ({ books, booksLoading: false, exportLedger, importLedger: vi.fn(), updateBook: vi.fn(), deleteBook: vi.fn() }),
  useShelves: () => ({ uniqueShelves: ["Classics"], shelfBooks: { Classics: [books[0]] }, getPreset: () => ({ color: "#000" }), renameShelf: vi.fn(), deleteShelf: vi.fn() }),
  useUi: () => ui,
  useModal: () => ({ open: false, quickAdd: vi.fn() }),
  useToast: () => ({ toast: "", toastType: "success" }),
  useApp: () => ({ deleteConfirmBook: null, detailsBook: null }),
}));

const { default: Workspace } = await import("./Workspace");

// Pages load lazily; allow for a slow or busy machine instead of the 1s default.
const LAZY = { timeout: 5000 };

function Harness() {
  const [view, navigate, location] = usePathRoute();
  return <Workspace view={view} navigate={navigate} location={location} />;
}

function renderAt(path) {
  window.history.replaceState(null, "", path);
  return render(
    <LanguageProvider>
      <Harness />
    </LanguageProvider>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("library", () => {
  it("shows the library with every book, the stats strip and the status tabs", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: "My Library" })).toBeTruthy();
    ["Dune", "Emma", "ಕರ್ವಾಲೋ"].forEach((title) => expect(screen.getAllByText(title).length).toBeGreaterThan(0));
    expect(screen.getByLabelText("Shelf stats summary")).toBeTruthy();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["All Books 3", "Want to read 1", "Reading 1", "Finished 1", "Favorites 1"]);
  });

  it("filters by status from the URL and from the tabs", () => {
    renderAt("/reading");
    const grid = document.querySelector(".pk-tiles");
    expect(within(grid).getByText("Emma")).toBeTruthy();
    expect(within(grid).queryByText("Dune")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Finished/ }));
    expect(window.location.pathname).toBe("/done");
    expect(within(document.querySelector(".pk-tiles")).getByText("Dune")).toBeTruthy();
  });

  it("filters by shelf, titles the page after it, and hides the status tabs", () => {
    renderAt("/" + encodeURIComponent("shelf:Classics"));
    expect(screen.getByRole("heading", { level: 1, name: "Shelf: Classics" })).toBeTruthy();
    expect(within(document.querySelector(".pk-tiles")).queryByText("Emma")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    // A shelf page offers a way back and a rename/delete menu.
    expect(screen.getByRole("link", { name: "All shelves" }).getAttribute("href")).toBe("/shelves");
    expect(screen.getByRole("button", { name: "Shelf options" })).toBeTruthy();
  });

  it("opens a shelf from the shelves page without a reload", async () => {
    renderAt("/shelves");
    const card = await screen.findByRole("link", { name: /Open shelf Classics/ }, LAZY);
    fireEvent.click(card);
    expect(window.location.pathname).toBe("/shelf%3AClassics");
    expect(screen.getByRole("heading", { level: 1, name: "Shelf: Classics" })).toBeTruthy();
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
    expect(document.querySelector(".pk-rows")).toBeTruthy();
  });

  it("opens the add-book dialog and book details through the ui actions", () => {
    renderAt("/");
    fireEvent.click(screen.getAllByText("Add Book")[0]);
    expect(ui.openNewBook).toHaveBeenCalled();
    fireEvent.click(within(document.querySelector(".pk-tiles")).getAllByText("Dune")[0]);
    expect(ui.openDetails).toHaveBeenCalled();
  });
});

describe("navigation", () => {
  it("has a labelled landmark, a skip link, and marks the current page", () => {
    renderAt("/galaxy");
    expect(screen.getAllByRole("navigation", { name: "Main navigation" }).length).toBe(2); // rail + tab bar
    expect(screen.getByText("Skip to content").getAttribute("href")).toBe("#main");
    const rail = document.querySelector(".pk-rail");
    expect(within(rail).getByRole("link", { name: /Galaxy/ }).getAttribute("aria-current")).toBe("page");
    expect(within(rail).getByRole("link", { name: /Library/ }).getAttribute("aria-current")).toBeNull();
  });

  it("keeps Library highlighted for status lists and shelves", () => {
    renderAt("/reading");
    expect(within(document.querySelector(".pk-rail")).getByRole("link", { name: /Library/ }).getAttribute("aria-current")).toBe("page");
  });

  it("navigates to a lazy page from the rail without a reload", async () => {
    renderAt("/");
    const insights = within(document.querySelector(".pk-rail")).getByRole("link", { name: /Insights/ });
    expect(insights.getAttribute("href")).toBe("/analytics");
    fireEvent.click(insights);
    expect(await screen.findByRole("group", { name: "Report period" }, LAZY)).toBeTruthy();
    expect(window.location.pathname).toBe("/analytics");
    expect(screen.queryByLabelText("Shelf stats summary")).toBeNull();
  });

  it("lets modified clicks (new tab) pass through to the browser", () => {
    renderAt("/");
    const link = within(document.querySelector(".pk-rail")).getByRole("link", { name: /Insights/ });
    fireEvent.click(link, { ctrlKey: true });
    expect(window.location.pathname).toBe("/");
  });

  it("falls back to the library for an unknown URL and fixes the address bar", () => {
    renderAt("/definitely-not-a-page");
    expect(screen.getByRole("heading", { level: 1, name: "My Library" })).toBeTruthy();
    expect(window.location.pathname).toBe("/");
  });

  it("renders the knowledge galaxy", async () => {
    renderAt("/galaxy");
    expect(await screen.findByPlaceholderText("Search books...", {}, LAZY)).toBeTruthy();
    expect(document.querySelectorAll(".galaxy-canvas circle").length).toBeGreaterThanOrEqual(3);
  });

  it("opens a nested route and exposes its params", async () => {
    renderAt("/kannada/author/bendre");
    expect(await screen.findByText("You opened: /kannada/author/bendre", {}, LAZY)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Kannada Explorer" })).toBeTruthy();
  });

  it("opens the More sheet on phones and navigates from it", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    const sheet = screen.getByRole("dialog", { name: "More" });
    expect(within(sheet).getByText("Export")).toBeTruthy();
    fireEvent.click(within(sheet).getByRole("link", { name: /Top Books/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.location.pathname).toBe("/topbooks");
  });
});

describe("account menu", () => {
  it("shows who is signed in and offers export, import and sign out", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Test Reader")).toBeTruthy();
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Export", "Import", "Sign out"]);

    fireEvent.click(within(menu).getByRole("menuitem", { name: "Export" }));
    expect(exportLedger).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes with Escape and signs out on request", () => {
    renderAt("/");
    const trigger = screen.getByRole("button", { name: "Account menu" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalled();
  });
});

describe("command palette", () => {
  const open = () => fireEvent.keyDown(document, { key: "/" });
  // The page has its own <select> (also a combobox), so look inside the dialog.
  const paletteInput = () => within(screen.getByRole("dialog")).getByRole("combobox");

  it("opens with / and with Ctrl+K, and closes with Escape", () => {
    renderAt("/");
    open();
    expect(screen.getByRole("dialog", { name: "Search or jump to…" })).toBeTruthy();
    expect(document.activeElement.getAttribute("role")).toBe("combobox");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("does not steal the / key while typing in a field", () => {
    renderAt("/");
    const filter = screen.getByLabelText("Filter library");
    filter.focus();
    fireEvent.keyDown(filter, { key: "/" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("finds a Kannada-titled book, then opens its details with Enter", () => {
    renderAt("/");
    open();
    const input = paletteInput();
    fireEvent.change(input, { target: { value: "ಕರ್" } });
    expect(within(screen.getByRole("dialog")).getAllByRole("option").map((o) => o.textContent)).toEqual(["ಕರ್ವಾಲೋಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ"]);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(ui.openDetails).toHaveBeenCalledWith(expect.objectContaining({ id: "3" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves with the arrow keys and jumps to a page", () => {
    renderAt("/");
    open();
    const input = paletteInput();
    fireEvent.change(input, { target: { value: "gal" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(window.location.pathname).toBe("/galaxy");
  });

  it("says so when nothing matches", () => {
    renderAt("/");
    open();
    fireEvent.change(paletteInput(), { target: { value: "qqqq-none" } });
    expect(screen.getByText("Nothing matches that")).toBeTruthy();
  });

  it("opens from the header search button and can start 'Add Book'", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: /Search or jump to/ }));
    fireEvent.click(screen.getByRole("option", { name: "Add Book" }));
    expect(ui.openNewBook).toHaveBeenCalled();
  });

});
