// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../../domain/book";

const books = [normalizeBook({ id: "1", title: "Dune", author: "Frank Herbert", shelves: ["Classics"] })];
const modal = { editing: false, form: null, onFormChange: vi.fn(), onSubmit: vi.fn((e) => e.preventDefault()), onClose: vi.fn(), quickAdd: vi.fn() };

vi.mock("../../../app/AppContext", () => ({
  useBooks: () => ({ books }),
  useModal: () => modal,
}));

const { default: BookFormModal } = await import("./BookFormModal");

const blankForm = { title: "", author: "", pages: "", currentPage: "", status: "want", rating: 0, tags: "", notes: "", description: "", genres: "", publishedYear: "", isbn: "", coverId: null, coverUrl: "", sourceKey: "", shelves: [] };

beforeEach(() => {
  vi.clearAllMocks();
  modal.editing = false;
  modal.form = { ...blankForm };
});
afterEach(cleanup);

describe("BookFormModal", () => {
  it("renders nothing without a form", () => {
    modal.form = null;
    const { container } = render(<BookFormModal />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the catalogue search only when adding", () => {
    const { rerender } = render(<BookFormModal />);
    expect(screen.getByLabelText("Search for a book")).toBeTruthy();
    modal.editing = true;
    rerender(<BookFormModal />);
    expect(screen.queryByLabelText("Search for a book")).toBeNull();
    expect(screen.getByText("Save Changes")).toBeTruthy();
  });

  it("patches the form as the user types", () => {
    render(<BookFormModal />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Karvalo"), { target: { value: "Emma" } });
    const update = modal.onFormChange.mock.calls[0][0];
    expect(update(blankForm)).toMatchObject({ title: "Emma" });
  });

  it("warns about a duplicate and offers existing shelves", () => {
    modal.form = { ...blankForm, title: "dune", author: "frank herbert" };
    render(<BookFormModal />);
    expect(screen.getByText(/is already in your library/)).toBeTruthy();
    expect(screen.getByText("Classics")).toBeTruthy();
  });

  it("adds a new shelf from the picker", () => {
    render(<BookFormModal />);
    fireEvent.change(screen.getByPlaceholderText(/Create new shelf/), { target: { value: "Summer" } });
    fireEvent.click(screen.getByText("Add Shelf"));
    const update = modal.onFormChange.mock.calls[0][0];
    expect(update(blankForm).shelves).toEqual(["Summer"]);
  });

  it("closes with Escape and the Cancel button, and submits the form", () => {
    render(<BookFormModal />);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByText("Cancel"));
    expect(modal.onClose).toHaveBeenCalledTimes(2);
    fireEvent.submit(screen.getByText("Save Book").closest("form"));
    expect(modal.onSubmit).toHaveBeenCalled();
  });
});
