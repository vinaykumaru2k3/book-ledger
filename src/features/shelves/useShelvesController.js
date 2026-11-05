/**
 * Shelves are not documents of their own: a shelf is just a name stored in
 * `book.shelves`. This hook derives the list of shelves from the books and
 * implements rename/delete by rewriting that field on every affected book,
 * in a single batched write so a failure can't leave a half-renamed shelf.
 */
import { useMemo } from "react";

const SHELF_COLORS = [
  "#d97706",
  "#6366f1",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
];

/** Stable look for a shelf (an accent colour), derived from its name. */
export function getPreset(shelfName) {
  const codeSum = shelfName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { color: SHELF_COLORS[codeSum % SHELF_COLORS.length] };
}

export function useShelvesController(books, updateManyBooks, notify) {
  const uniqueShelves = useMemo(() => {
    const list = new Set();
    books.forEach((book) => (book.shelves || []).forEach((s) => list.add(s)));
    return Array.from(list).sort();
  }, [books]);

  const shelfBooks = useMemo(() => {
    const map = {};
    books.forEach((book) => {
      (book.shelves || []).forEach((shelf) => {
        if (!map[shelf]) map[shelf] = [];
        map[shelf].push(book);
      });
    });
    return map;
  }, [books]);

  /** Resolves to true when the shelf was renamed. */
  async function renameShelf(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return false;
    if (uniqueShelves.includes(trimmed)) {
      notify("A shelf with this name already exists.", "error");
      return false;
    }

    const changes = (shelfBooks[oldName] || []).map((book) => ({
      id: book.id,
      updates: { shelves: book.shelves.map((s) => (s === oldName ? trimmed : s)) },
    }));
    return updateManyBooks(changes, `Shelf renamed to "${trimmed}".`);
  }

  async function deleteShelf(shelfName) {
    const changes = (shelfBooks[shelfName] || []).map((book) => ({
      id: book.id,
      updates: { shelves: book.shelves.filter((s) => s !== shelfName) },
    }));
    await updateManyBooks(changes, `Shelf "${shelfName}" removed. Its books are still in your library.`);
  }

  return { uniqueShelves, shelfBooks, getPreset, renameShelf, deleteShelf };
}
