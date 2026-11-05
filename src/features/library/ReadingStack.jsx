import React from "react";
import Card from "../../shared/pk/Card";
import BookCover from "../../shared/pk/BookCover";
import ProgressRibbon from "../../shared/pk/ProgressRibbon";
import { progressFor } from "../../domain/status";
import { useUi } from "../../app/AppContext";

/** A short titled list of books with progress (e.g. "Reading Now"). */
function ReadingStack({ title, books, empty }) {
  const { openDetails } = useUi();

  return (
    <Card className="pk-side__card">
      <h2 className="pk-side__title">{title}</h2>
      {books.length ? (
        <ul className="pk-stack">
          {books.map((book) => {
            const pct = progressFor(book);
            return (
              <li key={book.id}>
                <button type="button" className="pk-stack__item" onClick={() => openDetails(book)}>
                  <BookCover book={book} size="sm" />
                  <span className="pk-stack__text">
                    <strong>{book.title}</strong>
                    {book.author && <span>{book.author}</span>}
                    <span className="pk-stack__progress">
                      <ProgressRibbon value={pct} label={book.title} />
                      <span>{pct}%</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pk-side__empty">{empty}</p>
      )}
    </Card>
  );
}

export default ReadingStack;
