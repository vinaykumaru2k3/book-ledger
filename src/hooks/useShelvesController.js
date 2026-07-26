import { useMemo } from "react";

const BOARD_PRESETS = [
  { class: "shelf-board-sepia", color: "#d97706" },
  { class: "shelf-board-cosmic", color: "#6366f1" },
  { class: "shelf-board-botanical", color: "#10b981" },
  { class: "shelf-board-crimson", color: "#ef4444" },
  { class: "shelf-board-amber", color: "#f59e0b" },
  { class: "shelf-board-teal", color: "#14b8a6" },
];

export function getPreset(shelfName) {
  const codeSum = shelfName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BOARD_PRESETS[codeSum % BOARD_PRESETS.length];
}

export function useShelvesController(books, updateBook) {
  const uniqueShelves = useMemo(() => {
    const list = new Set();
    books.forEach((book) => {
      if (Array.isArray(book.shelves)) {
        book.shelves.forEach((s) => list.add(s));
      }
    });
    return Array.from(list).sort();
  }, [books]);

  const shelfBooks = useMemo(() => {
    const map = {};
    books.forEach((book) => {
      if (Array.isArray(book.shelves)) {
        book.shelves.forEach((shelf) => {
          if (!map[shelf]) map[shelf] = [];
          map[shelf].push(book);
        });
      }
    });
    return map;
  }, [books]);

  async function renameShelf(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (uniqueShelves.includes(trimmed) && trimmed !== oldName) {
      alert("A shelf board with this name already exists!");
      return;
    }

    const booksOnShelf = shelfBooks[oldName] || [];
    for (const book of booksOnShelf) {
      const updatedShelves = (book.shelves || []).map((s) => (s === oldName ? trimmed : s));
      // eslint-disable-next-line no-await-in-loop
      await updateBook(book.id, { shelves: updatedShelves });
    }
  }

  async function deleteShelf(shelfName) {
    const booksOnShelf = shelfBooks[shelfName] || [];
    for (const book of booksOnShelf) {
      const updatedShelves = (book.shelves || []).filter((s) => s !== shelfName);
      // eslint-disable-next-line no-await-in-loop
      await updateBook(book.id, { shelves: updatedShelves });
    }
  }

  return {
    uniqueShelves,
    shelfBooks,
    getPreset,
    renameShelf,
    deleteShelf,
  };
}
