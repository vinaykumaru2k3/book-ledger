// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../domain/book";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";

// Sampling a cover's colour needs a real image; tests use the fallback colour.
vi.mock("fast-average-color", () => ({
  FastAverageColor: class {
    getColorAsync() {
      return new Promise(() => {});
    }
  },
}));
vi.mock("../../services/bookApi", () => ({
  DESCRIPTION_PLACEHOLDER: "placeholder",
  fetchOpenLibraryDescription: vi.fn().mockResolvedValue("A fetched synopsis."),
}));

const state = { books: [], detailsBook: null };
let books0 = [];
const updateBook = vi.fn();
const quickAdd = vi.fn();
const closeDetails = vi.fn();
const openEditBook = vi.fn();

vi.mock("../../app/AppContext", () => ({
  useApp: () => ({ detailsBook: state.detailsBook }),
  useBooks: () => ({ books: state.books, updateBook }),
  useModal: () => ({ quickAdd }),
  useUi: () => ({ closeDetails, openEditBook }),
}));

const { default: BookDetailsModal } = await import("./BookDetailsModal");

const hobbit = normalizeBook({
  id: "h1",
  title: "The Hobbit",
  author: "Tolkien",
  status: "reading",
  pages: 300,
  currentPage: 90,
  rating: 3,
  notes: "Good.",
  description: "There and back again.",
  genres: ["Fantasy"],
  tags: ["Classic"],
  publishedYear: "1937",
});

const renderModal = () =>
  render(
    <LanguageProvider>
      <BookDetailsModal />
    </LanguageProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.books = [hobbit];
  state.detailsBook = hobbit;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("a book in your library", () => {
  it("shows its details with a labelled dialog", () => {
    renderModal();
    const dialog = screen.getByRole("dialog", { name: "The Hobbit" });
    expect(within(dialog).getByRole("heading", { level: 2, name: "The Hobbit" })).toBeTruthy();
    expect(within(dialog).getByText("Published 1937 · 300 pages")).toBeTruthy();
    expect(within(dialog).getByText("There and back again.")).toBeTruthy();
    expect(within(dialog).getByText("Fantasy")).toBeTruthy();
    expect(within(dialog).getByText("Classic")).toBeTruthy();
  });

  it("carries the cover's colour as a CSS variable and names the cover for the transition", () => {
    renderModal();
    expect(document.querySelector(".pk-details").style.getPropertyValue("--tint")).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(document.querySelector(".pk-details__cover .pk-cover").getAttribute("data-cover-id")).toBe("h1");
  });

  it("uses the library's current copy, so edits show up immediately", () => {
    renderModal();
    expect(screen.getByLabelText("Current page").value).toBe("90");
    cleanup();
    state.books = [{ ...hobbit, currentPage: 200 }];
    renderModal();
    expect(screen.getByLabelText("Current page").value).toBe("200");
    expect(screen.getByText("67% read", { selector: "span" })).toBeTruthy();
  });

  it("changes status, and saves pages when you leave the field or press Enter", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "done" } });
    expect(updateBook).toHaveBeenCalledWith("h1", { status: "done" });

    const page = screen.getByLabelText("Current page");
    fireEvent.change(page, { target: { value: "150" } });
    expect(updateBook).toHaveBeenCalledTimes(1); // typing alone does not save
    fireEvent.blur(page);
    expect(updateBook).toHaveBeenLastCalledWith("h1", { currentPage: 150 });

    const total = screen.getByLabelText("Total pages");
    fireEvent.change(total, { target: { value: "320" } });
    fireEvent.keyDown(total, { key: "Enter" });
    expect(updateBook).toHaveBeenLastCalledWith("h1", { pages: 320 });
  });

  it("does not save when nothing changed, and never stores negative or non-numeric pages", () => {
    renderModal();
    fireEvent.blur(screen.getByLabelText("Current page"));
    expect(updateBook).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Current page"), { target: { value: "-5" } });
    fireEvent.blur(screen.getByLabelText("Current page"));
    expect(updateBook).toHaveBeenLastCalledWith("h1", { currentPage: 0 });
  });

  it("sets, changes and clears the rating", () => {
    renderModal();
    expect(screen.getByRole("radio", { name: "3 stars" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    expect(updateBook).toHaveBeenLastCalledWith("h1", { rating: 5 });
    fireEvent.click(screen.getByRole("radio", { name: "3 stars" })); // click the current rating again
    expect(updateBook).toHaveBeenLastCalledWith("h1", { rating: 0 });
  });

  it("toggles favourite and can hand off to the full edit form", () => {
    renderModal();
    const favorite = screen.getByRole("button", { name: "Favorite" });
    expect(favorite.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(favorite);
    expect(updateBook).toHaveBeenCalledWith("h1", { favorite: true });

    fireEvent.click(screen.getByRole("button", { name: "Edit all details" }));
    expect(closeDetails).toHaveBeenCalled();
    expect(openEditBook).toHaveBeenCalledWith(expect.objectContaining({ id: "h1" }));
  });

  it("saves notes when you click away, and says so", async () => {
    updateBook.mockResolvedValue(undefined);
    renderModal();
    const notes = screen.getByLabelText("Personal notes");
    expect(notes.value).toBe("Good.");
    fireEvent.change(notes, { target: { value: "Good. Loved Gollum." } });
    expect(updateBook).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.blur(notes);
    });
    expect(updateBook).toHaveBeenCalledWith("h1", { notes: "Good. Loved Gollum." });
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("celebrates when the book becomes finished, then stops", () => {
    vi.useFakeTimers();
    const view = renderModal();
    expect(screen.queryByText("Finished!")).toBeNull();

    state.books = [{ ...hobbit, status: "done", currentPage: 300 }];
    view.rerender(
      <LanguageProvider>
        <BookDetailsModal />
      </LanguageProvider>
    );
    expect(screen.getByText("Finished!")).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText("Finished!")).toBeNull();
    vi.useRealTimers();
  });

  it("does not celebrate a book that was already finished when opened", () => {
    state.books = [{ ...hobbit, status: "done", currentPage: 300 }];
    state.detailsBook = state.books[0];
    renderModal();
    expect(screen.queryByText("Finished!")).toBeNull();
  });
});

describe("input is never lost or misleading", () => {
  it("saves notes that were typed when the dialog closes without clicking away (Escape)", () => {
    const view = renderModal();
    fireEvent.change(screen.getByLabelText("Personal notes"), { target: { value: "Typed, then pressed Escape." } });
    expect(updateBook).not.toHaveBeenCalled();
    view.unmount(); // closing the dialog removes it, with no blur event
    expect(updateBook).toHaveBeenCalledWith("h1", { notes: "Typed, then pressed Escape." });
  });

  it("does not re-save notes that were not changed", () => {
    const view = renderModal();
    view.unmount();
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("saves a page number that was typed when the dialog closes", () => {
    const view = renderModal();
    fireEvent.change(screen.getByLabelText("Current page"), { target: { value: "210" } });
    view.unmount();
    expect(updateBook).toHaveBeenCalledWith("h1", { currentPage: 210 });
  });

  it("shows the stored value again after saving, never a number that was not stored", async () => {
    updateBook.mockResolvedValue(undefined); // the store keeps 90, as when the rules adjust the value
    renderModal();
    const page = screen.getByLabelText("Current page");
    fireEvent.change(page, { target: { value: "150" } });
    expect(page.value).toBe("150"); // while typing, the draft is shown
    await act(async () => {
      fireEvent.blur(page);
    });
    expect(screen.getByLabelText("Current page").value).toBe("90");
  });
});

describe("closing", () => {
  it("closes with the button and with Escape", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeDetails).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when no book is chosen", () => {
    state.detailsBook = null;
    const { container } = renderModal();
    expect(container.firstChild).toBeNull();
  });
});

describe("a book that is not in your library (e.g. from Discover)", () => {
  const discovered = normalizeBook({ id: "/works/OL1W", title: "Fresh Find", author: "Someone", description: "A teaser." });

  beforeEach(() => {
    state.books = [hobbit];
    state.detailsBook = discovered;
  });

  it("offers to add it instead of editing controls", () => {
    renderModal();
    expect(screen.getByText("This book is not in your library yet.")).toBeTruthy();
    expect(screen.queryByLabelText("Current page")).toBeNull();
    expect(screen.queryByLabelText("Personal notes")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add to my library" }));
    expect(quickAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "Fresh Find", author: "Someone" }));
  });

  it("shows what other readers think, without a status chip or a repeated tag list", () => {
    state.detailsBook = { ...discovered, genres: ["Fantasy", "Magic"], tags: ["Fantasy", "Magic"], catalogueRating: 4.26, catalogueRatingCount: 1200, catalogueReaders: 24000 };
    renderModal();
    expect(screen.getByText("4.3")).toBeTruthy();
    expect(screen.getByText(/1.2K ratings · 24K readers on Open Library/)).toBeTruthy();
    expect(screen.queryByText("Want to read")).toBeNull();
    expect(screen.queryByText("Tags")).toBeNull();
    expect(screen.getAllByText("Fantasy")).toHaveLength(1);
  });

  it("switches to the editing controls once the book has been added (found by its source)", () => {
    state.detailsBook = normalizeBook({ id: "/works/OL9W", title: "Fresh Find", author: "Someone", sourceKey: "/works/OL9W" });
    const view = renderModal();
    expect(screen.getByRole("button", { name: "Add to my library" })).toBeTruthy();

    // The library now holds a copy with its own id but the same source.
    state.books = [...books0, normalizeBook({ id: "new-1", title: "Fresh Find", author: "Someone", sourceKey: "/works/OL9W", status: "reading", pages: 100, currentPage: 10 })];
    view.rerender(
      <LanguageProvider>
        <BookDetailsModal />
      </LanguageProvider>
    );
    expect(screen.queryByRole("button", { name: "Add to my library" })).toBeNull();
    expect(screen.getByLabelText("Current page").value).toBe("10");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "done" } });
    expect(updateBook).toHaveBeenCalledWith("new-1", { status: "done" }); // edits go to the library copy
  });

  it("loads the synopsis for Open Library works that have none", async () => {
    state.detailsBook = normalizeBook({ id: "/works/OL2W", title: "No Blurb", sourceKey: "/works/OL2W" });
    renderModal();
    expect(screen.getByText("Fetching synopsis…")).toBeTruthy();
    expect(await screen.findByText("A fetched synopsis.")).toBeTruthy();
  });
});
