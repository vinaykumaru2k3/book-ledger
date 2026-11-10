// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../domain/book";
import { shelfPath, shelfRoute } from "../../domain/library";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";

const books = [
  normalizeBook({ id: "1", title: "Dune", author: "Herbert", shelves: ["Sci-Fi"] }),
  normalizeBook({ id: "2", title: "Emma", author: "Austen", shelves: ["Classics"] }),
  normalizeBook({ id: "3", title: "Persuasion", author: "Austen", shelves: ["Classics"] }),
];

const shelves = {
  uniqueShelves: ["Classics", "Sci-Fi"],
  shelfBooks: { Classics: [books[1], books[2]], "Sci-Fi": [books[0]] },
  getPreset: () => ({ color: "#123456" }),
  renameShelf: vi.fn(),
  deleteShelf: vi.fn(),
  addToShelf: vi.fn(),
};
const state = { shelves };

vi.mock("../../app/AppContext", () => ({
  useShelves: () => state.shelves,
  useBooks: () => ({ books }),
}));

const { default: ShelvesDashboard } = await import("./ShelvesDashboard");
const { default: ShelfActions } = await import("./ShelfActions");

const wrap = (node) => render(<LanguageProvider>{node}</LanguageProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  state.shelves = shelves;
  shelves.renameShelf.mockResolvedValue(true);
  shelves.deleteShelf.mockResolvedValue(undefined);
  shelves.addToShelf.mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("shelf paths", () => {
  it("builds the URL of a shelf's library view", () => {
    expect(shelfRoute("Sci-Fi")).toBe("shelf:Sci-Fi");
    expect(shelfPath("Summer Reads")).toBe("/shelf%3ASummer%20Reads");
    expect(shelfPath("ಕನ್ನಡ")).toBe("/shelf%3A" + encodeURIComponent("ಕನ್ನಡ"));
  });
});

describe("ShelvesDashboard", () => {
  it("shows each shelf as a link with its book count", () => {
    wrap(<ShelvesDashboard navigate={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/shelf%3AClassics", "/shelf%3ASci-Fi"]);
    expect(links[0].getAttribute("aria-label")).toBe("Open shelf Classics (2 books)");
    expect(links[1].getAttribute("aria-label")).toBe("Open shelf Sci-Fi (1 book)");
  });

  it("navigates in-app on a plain click but lets Ctrl-click open a new tab", () => {
    const navigate = vi.fn();
    wrap(<ShelvesDashboard navigate={navigate} />);
    const link = screen.getByRole("link", { name: /Classics/ });
    fireEvent.click(link, { ctrlKey: true });
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(navigate).toHaveBeenCalledWith("shelf:Classics");
  });

  it("invites you to make a first shelf when there are none", () => {
    state.shelves = { ...shelves, uniqueShelves: [], shelfBooks: {} };
    wrap(<ShelvesDashboard navigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "No shelves yet" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("Shelf builder", () => {
  it("summarises the bookcase", () => {
    wrap(<ShelvesDashboard navigate={vi.fn()} />);
    expect(screen.getByText(/books shelved/)).toBeTruthy();
  });

  it("builds a new shelf from ticked books and opens it", async () => {
    const navigate = vi.fn();
    wrap(<ShelvesDashboard navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: "New shelf" }));
    const dialog = screen.getByRole("dialog", { name: "Build a new shelf" });
    const create = within(dialog).getByRole("button", { name: "Create shelf" });
    expect(create.disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText("Shelf name"), { target: { value: "  Desert Island  " } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Dune/ }));
    expect(within(dialog).getByText("1 selected")).toBeTruthy();
    fireEvent.click(create);

    await waitFor(() => expect(shelves.addToShelf).toHaveBeenCalledWith("Desert Island", ["1"]));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("shelf:Desert Island"));
  });

  it("will not reuse the name of an existing shelf", () => {
    wrap(<ShelvesDashboard navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "New shelf" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Shelf name"), { target: { value: "Classics" } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Dune/ }));
    expect(within(dialog).getByText(/already have a shelf with this name/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Create shelf" }).disabled).toBe(true);
  });
});

describe("ShelfActions", () => {
  const open = (label) => {
    fireEvent.click(screen.getByRole("button", { name: "Shelf options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: label }));
  };

  it("renames the shelf and reports the new name", async () => {
    const onRenamed = vi.fn();
    wrap(<ShelfActions name="Classics" onRenamed={onRenamed} onDeleted={vi.fn()} />);
    open("Rename shelf");

    const dialog = screen.getByRole("dialog", { name: "Rename shelf" });
    const input = within(dialog).getByLabelText("Shelf name");
    expect(input.value).toBe("Classics");
    fireEvent.change(input, { target: { value: "  Great Classics " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith("Great Classics"));
    expect(shelves.renameShelf).toHaveBeenCalledWith("Classics", "Great Classics");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays open and does not navigate when the rename is refused", async () => {
    shelves.renameShelf.mockResolvedValue(false); // e.g. name already taken
    const onRenamed = vi.fn();
    wrap(<ShelfActions name="Classics" onRenamed={onRenamed} onDeleted={vi.fn()} />);
    open("Rename shelf");
    fireEvent.change(screen.getByLabelText("Shelf name"), { target: { value: "Sci-Fi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(shelves.renameShelf).toHaveBeenCalled());
    expect(onRenamed).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Rename shelf" })).toBeTruthy();
  });

  it("does nothing when the name is unchanged", () => {
    wrap(<ShelfActions name="Classics" onRenamed={vi.fn()} onDeleted={vi.fn()} />);
    open("Rename shelf");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(shelves.renameShelf).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before deleting, then deletes and reports it", async () => {
    const onDeleted = vi.fn();
    wrap(<ShelfActions name="Classics" onRenamed={vi.fn()} onDeleted={onDeleted} />);
    open("Delete shelf");

    const dialog = screen.getByRole("dialog", { name: "Delete this shelf?" });
    expect(dialog.textContent).toContain("Its books stay in your library");
    expect(shelves.deleteShelf).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(shelves.deleteShelf).toHaveBeenCalledWith("Classics");
  });

  it("can be cancelled", () => {
    wrap(<ShelfActions name="Classics" onRenamed={vi.fn()} onDeleted={vi.fn()} />);
    open("Delete shelf");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(shelves.deleteShelf).not.toHaveBeenCalled();
  });
});
