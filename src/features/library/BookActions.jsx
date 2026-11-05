import React, { useState } from "react";
import { Edit3, FolderPlus, Heart, Trash2 } from "lucide-react";
import { useBooks, useShelves, useUi } from "../../app/AppContext";
import ShelfPopover from "./ShelfPopover";

/** Favourite / shelve / edit / delete buttons for one book card. */
function BookActions({ book, iconSize = 14 }) {
  const [shelving, setShelving] = useState(false);
  const { updateBook } = useBooks();
  const { uniqueShelves } = useShelves();
  const { openEditBook, openDeleteConfirm } = useUi();
  const current = book.shelves || [];

  const setShelves = (shelves) => updateBook(book.id, { shelves });
  const toggleShelf = (shelf) =>
    setShelves(current.includes(shelf) ? current.filter((s) => s !== shelf) : [...current, shelf]);
  const createShelf = (name) => !current.includes(name) && setShelves([...current, name]);

  return (
    <div className={`book-actions ${shelving ? "open" : ""}`}>
      <button
        className={book.favorite ? "action-btn active favorite-btn" : "action-btn favorite-btn"}
        onClick={() => updateBook(book.id, { favorite: !book.favorite })}
        title="Toggle favorite"
        type="button"
      >
        <Heart size={iconSize} fill={book.favorite ? "currentColor" : "none"} />
      </button>
      <button
        className={shelving ? "action-btn active shelve-btn" : "action-btn shelve-btn"}
        onClick={() => setShelving(!shelving)}
        title="Quick Shelve"
        type="button"
      >
        <FolderPlus size={iconSize} />
      </button>
      <button className="action-btn edit-btn" onClick={() => openEditBook(book)} title="Edit book details" type="button">
        <Edit3 size={iconSize} />
      </button>
      <button
        className="action-btn danger delete-btn"
        onClick={() => openDeleteConfirm(book)}
        title="Remove book"
        type="button"
      >
        <Trash2 size={iconSize} />
      </button>
      {shelving && (
        <ShelfPopover
          shelves={uniqueShelves}
          selected={current}
          onToggle={toggleShelf}
          onCreate={createShelf}
          onClose={() => setShelving(false)}
        />
      )}
    </div>
  );
}

export default BookActions;
