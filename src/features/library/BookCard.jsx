import React from "react";
import { Heart } from "lucide-react";
import Cover from "../../shared/ui/Cover";
import { STATUSES, progressFor } from "../../domain/status";
import { useUi } from "../../app/AppContext";
import BookActions from "./BookActions";
import StatusChip from "./StatusChip";

function CoverButton({ book, badgeSize, badgeTitle, onOpen }) {
  return (
    <div className="cover-wrapper clickable-cover" onClick={onOpen} title="Click to view details">
      <Cover book={book} />
      {book.favorite && (
        <div className="cover-favorite-badge" title={badgeTitle}>
          <Heart size={badgeSize} fill="currentColor" />
        </div>
      )}
    </div>
  );
}

function Heading({ book, onOpen, withTitleAttr }) {
  return (
    <div className="book-heading">
      <h3 className="book-title clickable-title" onClick={onOpen} title={withTitleAttr ? book.title : undefined}>
        {book.title}
      </h3>
      <p className="book-author-meta">
        {book.author || "Unknown Author"}
        {book.publishedYear ? ` • ${book.publishedYear}` : ""}
      </p>
    </div>
  );
}

/** A book as a grid tile (`layout="grid"`) or a table-like row (`layout="list"`). */
function BookCard({ book, layout }) {
  const { openDetails } = useUi();
  const open = () => openDetails(book);
  const progress = progressFor(book);
  const statusColor = STATUSES[book.status]?.color || "#6b7280";

  if (layout === "list") {
    return (
      <article className="book-card row">
        <CoverButton book={book} badgeSize={10} onOpen={open} />

        <div className="book-main">
          <Heading book={book} onOpen={open} />

          <div className="status-pill-column">
            <StatusChip status={book.status} />
          </div>

          <div className="progress-column">
            {book.status === "reading" ? (
              <span className="list-progress-text">
                <strong>{book.currentPage || 0}</strong> / {book.pages || 0} pages ({progress}%)
              </span>
            ) : (
              <span className="list-pages-text">{book.pages ? `${book.pages} pages` : "No page count"}</span>
            )}
          </div>

          <BookActions book={book} iconSize={13} />
        </div>
      </article>
    );
  }

  return (
    <article className="book-card">
      <CoverButton book={book} badgeSize={12} badgeTitle="Favorite Book" onOpen={open} />

      <div className="book-main">
        <Heading book={book} onOpen={open} withTitleAttr />

        {book.status === "reading" && book.pages ? (
          <div className="progress-area">
            <div className="progress-copy">
              <strong className="progress-percentage">{progress}%</strong>
              <span className="progress-pages">
                {book.currentPage.toLocaleString()} / {book.pages.toLocaleString()} pages
              </span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%`, backgroundColor: statusColor }} />
            </div>
          </div>
        ) : null}

        <div className="card-status-footer">
          <StatusChip status={book.status} />
        </div>
      </div>

      <BookActions book={book} />
    </article>
  );
}

export default BookCard;
