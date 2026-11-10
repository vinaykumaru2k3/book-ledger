import React from "react";
import { Bookmark, Check, Star } from "lucide-react";
import ProgressRibbon from "../../shared/pk/ProgressRibbon";
import { progressFor } from "../../domain/status";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/** Small read-only star rating (whole and half stars are drawn by clipping). */
export function StarLine({ rating }) {
  const { t } = useLanguage();
  return (
    <span className="pk-starline" role="img" aria-label={t("book.ratingOf", { rating })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="pk-starline__star" style={{ "--fill": `${Math.min(Math.max(rating - n + 1, 0), 1) * 100}%` }}>
          <Star size={13} aria-hidden="true" />
          <Star size={13} aria-hidden="true" fill="currentColor" />
        </span>
      ))}
    </span>
  );
}

/**
 * One quiet line about where a book stands: progress while reading, the
 * rating once finished, or a bookmark while it waits.
 */
function BookStatusLine({ book, compact = false }) {
  const { t } = useLanguage();

  if (book.status === "reading") {
    if (!book.pages) {
      return (
        <span className="pk-statusline pk-statusline--reading">
          <span className="pk-statusline__dot" aria-hidden="true" />
          {t("status.reading")}
        </span>
      );
    }
    const progress = progressFor(book);
    return (
      <span className="pk-statusline pk-statusline--progress">
        <ProgressRibbon value={progress} label={t("book.readProgress", { title: book.title })} />
        <span className="pk-statusline__text">
          <strong>{progress}%</strong>
          {!compact && <> · {t("book.progress", { current: (book.currentPage || 0).toLocaleString(), total: book.pages.toLocaleString() })}</>}
        </span>
      </span>
    );
  }

  if (book.status === "done") {
    return book.rating ? (
      <span className="pk-statusline pk-statusline--done">
        <StarLine rating={book.rating} />
      </span>
    ) : (
      <span className="pk-statusline pk-statusline--done">
        <Check size={14} aria-hidden="true" />
        {t("status.done")}
      </span>
    );
  }

  return (
    <span className="pk-statusline pk-statusline--want">
      <Bookmark size={13} aria-hidden="true" />
      {t("status.want")}
    </span>
  );
}

export default BookStatusLine;
