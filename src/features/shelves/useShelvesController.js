/**
 * Shelves are not documents of their own: a shelf is just a name stored in
 * `book.shelves`. This hook derives the list of shelves from the books and
 * implements rename/delete by rewriting that field on every affected book,
 * in a single batched write so a failure can't leave a half-renamed shelf.
 */
import { useMemo } from "react";

// The palette's jewel tones (design-tokens.css), one per shelf.
const SHELF_COLORS = [
  "var(--pk-garnet-bright)",
  "var(--pk-peacock)",
  "var(--pk-sapphire)",
  "var(--pk-gold)",
  "var(--pk-emerald)",
  "var(--pk-amethyst)",
  "var(--pk-copper)",
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

  /**
   * Puts the given books on a shelf (creating it if it is new), in one batched
   * write. Books already on the shelf are left alone. Resolves to true on success.
   */
  async function addToShelf(shelfName, bookIds) {
    const name = shelfName.trim();
    if (!name) return false;
    const changes = books
      .filter((book) => bookIds.includes(book.id) && !(book.shelves || []).includes(name))
      .map((book) => ({ id: book.id, updates: { shelves: [...(book.shelves || []), name] } }));
    if (!changes.length) return true;
    const isNew = !uniqueShelves.includes(name);
    const count = changes.length === 1 ? "1 book" : `${changes.length} books`;
    return updateManyBooks(changes, isNew ? `Shelf "${name}" created with ${count}.` : `Added ${count} to "${name}".`);
  }

  return { uniqueShelves, shelfBooks, getPreset, renameShelf, deleteShelf, addToShelf };
}
