import React from "react";
import BookCover from "../../shared/pk/BookCover";
import ProgressRibbon from "../../shared/pk/ProgressRibbon";
import { progressFor } from "../../domain/status";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useUi } from "../../app/AppContext";
import BookActions from "./BookActions";
import StatusChip from "./StatusChip";

/** A book as one row of the list view. */
function BookRow({ book }) {
  const { t } = useLanguage();
  const { openDetails } = useUi();
  const progress = progressFor(book);

  return (
    <article className="pk-row">
      <button type="button" className="pk-row__open" onClick={(event) => openDetails(book, event.currentTarget.querySelector(".pk-cover"))}>
        <BookCover book={book} size="sm" />
        <span className="pk-row__text">
          <span className="pk-row__title">{book.title}</span>
          <span className="pk-row__author">
            {book.author || t("book.unknownAuthor")}
            {book.publishedYear ? ` • ${book.publishedYear}` : ""}
          </span>
        </span>
      </button>

      <div className="pk-row__status">
        <StatusChip status={book.status} />
      </div>

      <div className="pk-row__progress">
        {book.status === "reading" && book.pages ? (
          <>
            <ProgressRibbon value={progress} />
            <span>
              {progress}% · {t("book.progress", { current: book.currentPage || 0, total: book.pages })}
            </span>
          </>
        ) : (
          <span>{book.pages ? t("book.pages", { count: book.pages }) : t("book.noPages")}</span>
        )}
      </div>

      <BookActions book={book} />
    </article>
  );
}

export default BookRow;
