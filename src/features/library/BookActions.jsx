import React, { useRef, useState } from "react";
import { Edit3, FolderPlus, Heart, Trash2 } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useBooks, useShelves, useUi } from "../../app/AppContext";
import ShelfPopover from "./ShelfPopover";

/** Favourite / shelve / edit / delete buttons for one book. */
function BookActions({ book }) {
  const { t } = useLanguage();
  const [shelving, setShelving] = useState(false);
  const shelfButton = useRef(null);
  const { updateBook } = useBooks();
  const { uniqueShelves } = useShelves();
  const { openEditBook, openDeleteConfirm } = useUi();
  const current = book.shelves || [];

  const setShelves = (shelves) => updateBook(book.id, { shelves });
  const toggleShelf = (shelf) =>
    setShelves(current.includes(shelf) ? current.filter((s) => s !== shelf) : [...current, shelf]);
  const createShelf = (name) => !current.includes(name) && setShelves([...current, name]);

  return (
    <div className={shelving ? "pk-actions pk-actions--open" : "pk-actions"}>
      <button
        type="button"
        className={book.favorite ? "pk-icon-btn pk-act pk-act--on" : "pk-icon-btn pk-act"}
        aria-pressed={Boolean(book.favorite)}
        title={t("book.favorite")}
        aria-label={t("book.favorite")}
        onClick={() => updateBook(book.id, { favorite: !book.favorite })}
      >
        <Heart size={16} fill={book.favorite ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <button
        ref={shelfButton}
        type="button"
        className="pk-icon-btn pk-act"
        aria-haspopup="dialog"
        aria-expanded={shelving}
        title={t("book.shelve")}
        aria-label={t("book.shelve")}
        onClick={() => setShelving(!shelving)}
      >
        <FolderPlus size={16} aria-hidden="true" />
      </button>
      <button type="button" className="pk-icon-btn pk-act" title={t("book.edit")} aria-label={t("book.edit")} onClick={() => openEditBook(book)}>
        <Edit3 size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="pk-icon-btn pk-act pk-act--danger"
        title={t("book.remove")}
        aria-label={t("book.remove")}
        onClick={() => openDeleteConfirm(book)}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>

      {shelving && (
        <ShelfPopover anchorRef={shelfButton} shelves={uniqueShelves} selected={current} onToggle={toggleShelf} onCreate={createShelf} onClose={() => setShelving(false)} />
      )}
    </div>
  );
}

export default BookActions;
