import React from "react";
import BookRow from "./BookRow";
import BookTile from "./BookTile";
import ShelfView from "./ShelfView";

/** Renders the same books in the chosen layout: "grid", "list" or "shelf". */
function BookList({ books, layout }) {
  if (layout === "shelf") return <ShelfView books={books} />;

  if (layout === "list") {
    return (
      <div className="pk-rows">
        {books.map((book) => (
          <BookRow key={book.id} book={book} />
        ))}
      </div>
    );
  }

  return (
    <div className="pk-tiles">
      {books.map((book) => (
        <BookTile key={book.id} book={book} />
      ))}
    </div>
  );
}

export default BookList;
