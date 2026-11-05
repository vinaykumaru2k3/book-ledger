// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../../domain/book";
import { LanguageProvider } from "../../../shared/i18n/LanguageContext";

const books = [normalizeBook({ id: "1", title: "Dune", author: "Frank Herbert", status: "done", shelves: ["Classics"], sourceKey: "gb-dune" })];
const modal = { editing: false, form: null, onFormChange: vi.fn(), onSubmit: vi.fn((e) => e.preventDefault()), onClose: vi.fn(), quickAdd: vi.fn() };

const searchVolumes = vi.fn();
const buildFormFromVolume = vi.fn();
vi.mock("../../../services/bookApi", () => ({
  searchVolumes: (...args) => searchVolumes(...args),
  buildFormFromVolume: (...args) => buildFormFromVolume(...args),
}));
vi.mock("../../../app/AppContext", () => ({
  useBooks: () => ({ books }),
  useModal: () => modal,
}));

const { default: BookFormModal } = await import("./BookFormModal");

const blankForm = { title: "", author: "", pages: "", currentPage: "", status: "want", rating: 0, tags: "", notes: "", description: "", genres: "", publishedYear: "", isbn: "", coverId: null, coverUrl: "", sourceKey: "", shelves: [] };
const volume = (id, title, extra = {}) => ({ id, volumeInfo: { title, authors: ["A. Writer"], publishedDate: "1999-05-01", pageCount: 321, categories: ["Fiction"], ...extra } });

const renderModal = () =>
  render(
    <LanguageProvider>
      <BookFormModal />
    </LanguageProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  modal.editing = false;
  modal.form = { ...blankForm };
  searchVolumes.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

describe("the dialog", () => {
  it("renders nothing without a form", () => {
    modal.form = null;
    const { container } = renderModal();
    expect(container.firstChild).toBeNull();
  });

  it("is titled for adding or editing, and shows the search only when adding", () => {
    const { unmount } = renderModal();
    expect(screen.getByRole("dialog", { name: "Add to library" })).toBeTruthy();
    expect(screen.getByLabelText("Find a book")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save book" })).toBeTruthy();
    unmount();

    modal.editing = true;
    renderModal();
    expect(screen.getByRole("dialog", { name: "Edit book" })).toBeTruthy();
    expect(screen.queryByLabelText("Find a book")).toBeNull();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  });

  it("puts the essentials up front and the rest behind 'More details' (open when editing)", () => {
    const { unmount } = renderModal();
    expect(screen.getByLabelText("Title *")).toBeTruthy();
    expect(document.querySelector("details.pk-more").open).toBe(false);
    unmount();
    modal.editing = true;
    renderModal();
    expect(document.querySelector("details.pk-more").open).toBe(true);
  });

  it("closes with Escape, Cancel and the close button, but not when the backdrop is clicked", () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement); // outside click
    expect(modal.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(modal.onClose).toHaveBeenCalledTimes(3);
  });

  it("submits the form from the footer button", () => {
    renderModal();
    fireEvent.submit(document.getElementById("book-form"));
    expect(modal.onSubmit).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save book" }).getAttribute("form")).toBe("book-form");
  });
});

describe("the form", () => {
  it("patches the form as the user types", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Emma" } });
    expect(modal.onFormChange.mock.calls[0][0](blankForm)).toMatchObject({ title: "Emma" });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "reading" } });
    expect(modal.onFormChange.mock.calls[1][0](blankForm)).toMatchObject({ status: "reading" });
  });

  it("warns about a duplicate and offers existing shelves", () => {
    modal.form = { ...blankForm, title: "dune", author: "frank herbert" };
    renderModal();
    expect(screen.getByText(/already in your library \(Finished\)/)).toBeTruthy();
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByRole("button", { name: "Classics" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("adds a new shelf, and toggles an existing one", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Create a new shelf (e.g. Summer Reads)"), { target: { value: "Summer" } });
    fireEvent.click(screen.getByRole("button", { name: "Add shelf" }));
    expect(modal.onFormChange.mock.calls[0][0](blankForm).shelves).toEqual(["Summer"]);

    fireEvent.click(screen.getByRole("button", { name: "Classics" }));
    expect(modal.onFormChange.mock.calls[1][0](blankForm).shelves).toEqual(["Classics"]);
  });

  it("sets the rating with stars", () => {
    renderModal();
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(modal.onFormChange.mock.calls[0][0](blankForm).rating).toBe(4);
  });
});

describe("catalogue lookup", () => {
  const search = async (text) => {
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Find a book"), { target: { value: text } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    vi.useRealTimers();
  };

  it("waits for three characters and debounces before searching", async () => {
    renderModal();
    await search("ab");
    expect(searchVolumes).not.toHaveBeenCalled();
    await search("abc");
    expect(searchVolumes).toHaveBeenCalledWith("abc", "all");
  });

  it("lists results inline with a count announced politely", async () => {
    searchVolumes.mockResolvedValue([volume("v1", "Karvalo"), volume("v2", "Chidambara Rahasya")]);
    renderModal();
    await search("karv");
    expect(await screen.findByText("Karvalo")).toBeTruthy();
    expect(screen.getByText("Chidambara Rahasya")).toBeTruthy();
    expect(screen.getByText("2 results").closest("[aria-live]")).toBeTruthy();
    expect(screen.getAllByText(/A. Writer • 1999 • 321 pages/)).toHaveLength(2);
  });

  it("fills the form from a result, merging with what you typed, then folds the list", async () => {
    searchVolumes.mockResolvedValue([volume("v1", "Karvalo")]);
    buildFormFromVolume.mockResolvedValue({ ...blankForm, title: "Karvalo", author: "Tejaswi", pages: "200" });
    renderModal();
    await search("karv");
    fireEvent.click(await screen.findByRole("button", { name: "Fill form" }));

    await waitFor(() => expect(modal.onFormChange).toHaveBeenCalled());
    const merged = modal.onFormChange.mock.calls[0][0]({ ...blankForm, title: "My own title", status: "reading" });
    expect(merged).toMatchObject({ title: "My own title", author: "Tejaswi", pages: "200", status: "reading" });
    await waitFor(() => expect(screen.queryByText("Karvalo", { selector: "strong" })).toBeNull());
  });

  it("quick-adds a result straight to the library", async () => {
    searchVolumes.mockResolvedValue([volume("v1", "Karvalo")]);
    buildFormFromVolume.mockResolvedValue({ ...blankForm, title: "Karvalo" });
    renderModal();
    await search("karv");
    fireEvent.click(await screen.findByRole("button", { name: "Quick add" }));
    await waitFor(() => expect(modal.quickAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "Karvalo" })));
  });

  it("marks results you already own and disables quick add for them", async () => {
    searchVolumes.mockResolvedValue([volume("gb-dune", "Dune")]);
    renderModal();
    await search("dune");
    const added = await screen.findByRole("button", { name: "Added" });
    expect(added.disabled).toBe(true);
  });

  it("explains a search with no matches and a failed one", async () => {
    renderModal();
    await search("zzzz");
    expect(await screen.findByText("No matching books found.")).toBeTruthy();

    searchVolumes.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await search("yyyy");
    expect(await screen.findByText("Search failed. Please try again.")).toBeTruthy();
  });

  it("switches the kind of search", async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Search by"), { target: { value: "author" } });
    await search("tolkien");
    expect(searchVolumes).toHaveBeenCalledWith("tolkien", "author");
  });
});

describe("delete confirmation", () => {
  it("asks first, then deletes and closes", async () => {
    const deleteBook = vi.fn().mockResolvedValue(undefined);
    const closeDeleteConfirm = vi.fn();
    vi.resetModules();
    vi.doMock("../../../app/AppContext", () => ({
      useApp: () => ({ deleteConfirmBook: books[0] }),
      useUi: () => ({ closeDeleteConfirm }),
      useBooks: () => ({ deleteBook }),
    }));
    const { default: DeleteConfirmModal } = await import("../DeleteConfirmModal");
    const { LanguageProvider: Provider } = await import("../../../shared/i18n/LanguageContext");
    render(
      <Provider>
        <DeleteConfirmModal />
      </Provider>
    );

    const dialog = screen.getByRole("dialog", { name: "Remove book" });
    expect(within(dialog).getByText(/Are you sure you want to remove/).textContent).toContain("Dune");
    expect(deleteBook).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(closeDeleteConfirm).toHaveBeenCalled());
    expect(deleteBook).toHaveBeenCalledWith(books[0]);
  });
});
