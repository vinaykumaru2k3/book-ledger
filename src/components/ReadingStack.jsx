import React from "react";
import Cover from "./Cover";

function progressFor(book) {
  if (!book.pages) return book.status === "done" ? 100 : 0;
  return Math.min(Math.max(Math.round((book.currentPage / book.pages) * 100), 0), 100);
}

function ReadingStack({ title, books, empty }) {
  return (
    <div className="insight-block compact">
      <div className="panel-heading">
        <h3>{title}</h3>
      </div>
      {books.length ? (
        <div className="stack-list">
          {books.map((book) => {
            const pct = progressFor(book);
            return (
              <div className="stack-item" key={book.id}>
                <Cover book={book} className="tiny" />
                <div className="stack-info">
                  <strong>{book.title}</strong>
                  {book.author && <span className="stack-author">{book.author}</span>}
                  <div className="stack-progress-row">
                    <div className="stack-progress-track">
                      <div className="stack-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="stack-pct">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}

export default ReadingStack;
