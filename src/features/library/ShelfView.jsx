import React from "react";
import { getCoverStyle } from "../../shared/ui/Cover";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useUi } from "../../app/AppContext";

// A spine's size follows the book: thicker for more pages, within sensible limits.
const spineHeight = (pages) => 150 + Math.min(Math.max(pages || 0, 0), 700) / 700 * 56;
const spineWidth = (pages) => 28 + Math.min(Math.max(pages || 0, 0), 900) / 900 * 22;

/**
 * Books standing spine-out on wooden shelves. Each spine is coloured like its
 * cover jacket; the title runs vertically. Click to open the book.
 */
function ShelfView({ books }) {
  const { t } = useLanguage();
  const { openDetails } = useUi();

  return (
    <div className="pk-shelfview" role="list">
      {books.map((book) => (
        <div className="pk-shelfslot" role="listitem" key={book.id}>
          <button
            type="button"
            className={`pk-spine pk-spine--${book.status}`}
            style={{ ...getCoverStyle(`${book.title}${book.author || ""}`), "--spine-h": `${spineHeight(book.pages)}px`, "--spine-w": `${spineWidth(book.pages)}px` }}
            title={book.author ? `${book.title} — ${book.author}` : book.title}
            aria-label={t("book.open", { title: book.title })}
            onClick={() => openDetails(book)}
          >
            <span className="pk-spine__title">{book.title}</span>
            {book.favorite && <span className="pk-spine__fav" aria-hidden="true" />}
          </button>
        </div>
      ))}
    </div>
  );
}

export default ShelfView;
