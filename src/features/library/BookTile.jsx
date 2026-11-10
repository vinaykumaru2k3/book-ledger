import React from "react";
import { Heart } from "lucide-react";
import BookCover from "../../shared/pk/BookCover";
import { langOf } from "../../shared/lib/script";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useUi } from "../../app/AppContext";
import BookActions from "./BookActions";
import BookStatusLine from "./BookStatusLine";

/**
 * A book in the grid, cover first: the cover (with a ribbon bookmark while
 * reading and a heart for favourites), title, author and one quiet status line.
 */
function BookTile({ book }) {
  const { t } = useLanguage();
  const { openDetails } = useUi();

  return (
    <article className={`pk-tile pk-tile--${book.status}`}>
      <button type="button" className="pk-tile__open" onClick={(event) => openDetails(book, event.currentTarget.querySelector(".pk-cover"))}>
        <span className="pk-tile__cover">
          <BookCover book={book} size="fluid" />
          {book.status === "reading" && <span className="pk-tile__ribbon" aria-hidden="true" />}
          {book.favorite && (
            <span className="pk-tile__fav" title={t("book.favoriteBadge")}>
              <Heart size={13} fill="currentColor" aria-label={t("book.favoriteBadge")} />
            </span>
          )}
        </span>
        <span className="pk-tile__title" lang={langOf(book.title)}>
          {book.title}
        </span>
        <span className="pk-tile__author" lang={langOf(book.author || "")}>
          {book.author || t("book.unknownAuthor")}
          {book.publishedYear ? ` · ${book.publishedYear}` : ""}
        </span>
      </button>

      <div className="pk-tile__foot">
        <BookStatusLine book={book} />
      </div>

      <BookActions book={book} />
    </article>
  );
}

export default BookTile;
