import React from "react";
import { Heart } from "lucide-react";
import BookCover from "../../shared/pk/BookCover";
import ProgressRibbon from "../../shared/pk/ProgressRibbon";
import { progressFor } from "../../domain/status";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useUi } from "../../app/AppContext";
import BookActions from "./BookActions";
import StatusChip from "./StatusChip";

/** A book as a card in the grid: cover, title, author, status, and progress while reading. */
function BookTile({ book }) {
  const { t } = useLanguage();
  const { openDetails } = useUi();
  const progress = progressFor(book);

  return (
    <article className="pk-tile">
      <button type="button" className="pk-tile__open" onClick={() => openDetails(book)}>
        <span className="pk-tile__cover">
          <BookCover book={book} size="fluid" />
          {book.favorite && (
            <span className="pk-tile__fav" title={t("book.favoriteBadge")}>
              <Heart size={14} fill="currentColor" aria-label={t("book.favoriteBadge")} />
            </span>
          )}
        </span>
        <span className="pk-tile__title">{book.title}</span>
        <span className="pk-tile__author">
          {book.author || t("book.unknownAuthor")}
          {book.publishedYear ? ` • ${book.publishedYear}` : ""}
        </span>
      </button>

      <div className="pk-tile__foot">
        <StatusChip status={book.status} />
        {book.status === "reading" && book.pages ? (
          <div className="pk-tile__progress">
            <ProgressRibbon value={progress} />
            <span>
              {progress}% · {t("book.progress", { current: book.currentPage.toLocaleString(), total: book.pages.toLocaleString() })}
            </span>
          </div>
        ) : null}
      </div>

      <BookActions book={book} />
    </article>
  );
}

export default BookTile;
