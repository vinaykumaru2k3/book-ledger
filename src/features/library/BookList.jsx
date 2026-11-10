import React from "react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import BookRow from "./BookRow";
import BookTile from "./BookTile";
import ShelfView from "./ShelfView";

/** Renders the same books in the chosen layout: "grid", "list" or "shelf". */
function BookList({ books, layout }) {
  const { t } = useLanguage();
  if (layout === "shelf") return <ShelfView books={books} />;

  if (layout === "list") {
    return (
      <div className="pk-rows">
        <div className="pk-rows__head" aria-hidden="true">
          <span>{t("list.book")}</span>
          <span>{t("list.status")}</span>
          <span>{t("list.progress")}</span>
          <span>{t("list.pages")}</span>
          <span />
        </div>
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
