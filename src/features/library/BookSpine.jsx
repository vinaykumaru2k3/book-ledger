import React from "react";
import { getCoverStyle } from "../../shared/lib/cover";

// A spine's size follows the book: thicker for more pages, within sensible limits.
export const spineHeight = (pages) => 150 + (Math.min(Math.max(pages || 0, 0), 700) / 700) * 56;
export const spineWidth = (pages) => 28 + (Math.min(Math.max(pages || 0, 0), 900) / 900) * 22;

/**
 * One book standing spine-out, coloured like its cover jacket, with the title
 * running vertically. Renders a button when `onOpen` is given, otherwise a
 * plain decorative element (used for the previews on shelf cards).
 */
function BookSpine({ book, onOpen, label, scale = 1 }) {
  const style = {
    ...getCoverStyle(`${book.title}${book.author || ""}`),
    "--spine-h": `${Math.round(spineHeight(book.pages) * scale)}px`,
    "--spine-w": `${Math.round(spineWidth(book.pages) * scale)}px`,
  };
  const className = `pk-spine pk-spine--${book.status}`;
  const content = (
    <>
      <span className="pk-spine__title">{book.title}</span>
      {book.favorite && <span className="pk-spine__fav" aria-hidden="true" />}
    </>
  );

  if (!onOpen) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      title={book.author ? `${book.title} — ${book.author}` : book.title}
      aria-label={label}
      onClick={() => onOpen(book)}
    >
      {content}
    </button>
  );
}

export default BookSpine;
