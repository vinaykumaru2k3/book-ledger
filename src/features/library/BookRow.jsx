import React from "react";
import BookCover from "../../shared/pk/BookCover";
import { langOf } from "../../shared/lib/script";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useUi } from "../../app/AppContext";
import BookActions from "./BookActions";
import BookStatusLine from "./BookStatusLine";

/** A book as one ruled line of the list view (the reading ledger). */
function BookRow({ book }) {
  const { t } = useLanguage();
  const { openDetails } = useUi();

  return (
    <article className={`pk-row pk-row--${book.status}`}>
      <button type="button" className="pk-row__open" onClick={(event) => openDetails(book, event.currentTarget.querySelector(".pk-cover"))}>
        <BookCover book={book} size="sm" />
        <span className="pk-row__text">
          <span className="pk-row__title" lang={langOf(book.title)}>
            {book.title}
            {book.favorite && (
              <span className="pk-row__fav" title={t("book.favoriteBadge")}>
                ♥
              </span>
            )}
          </span>
          <span className="pk-row__author" lang={langOf(book.author || "")}>
            {book.author || t("book.unknownAuthor")}
            {book.publishedYear ? ` · ${book.publishedYear}` : ""}
          </span>
        </span>
      </button>

      <div className="pk-row__status">
        <span className={`pk-row__dot pk-row__dot--${book.status}`} aria-hidden="true" />
        {t(`status.${["want", "reading", "done"].includes(book.status) ? book.status : "want"}`)}
      </div>

      <div className="pk-row__progress">
        {book.status === "want" ? <span className="pk-row__muted">–</span> : <BookStatusLine book={book} />}
      </div>

      <div className="pk-row__pages">{book.pages ? book.pages.toLocaleString() : "–"}</div>

      <BookActions book={book} />
    </article>
  );
}

export default BookRow;
