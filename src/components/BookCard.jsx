import React, { useState, useEffect } from "react";
import { Trash2, Edit3, Heart, Archive, BookOpen, CheckCircle, Search } from "lucide-react";
import Cover from "./Cover";
import Rating from "./Rating";
import { STATUSES, progressFor, formatDate } from "./constants";

function BookCard({ book, layout, onDelete, onEdit, onUpdate, onViewDetails }) {
  const progress = progressFor(book);
  const StatusIcon = STATUSES[book.status]?.icon;
  const statusColor = STATUSES[book.status]?.color || "#10b981";
  const [pageDraft, setPageDraft] = useState(String(book.currentPage || 0));

  useEffect(() => {
    setPageDraft(String(book.currentPage || 0));
  }, [book.currentPage]);

  function commitPage() {
    onUpdate(book.id, { currentPage: pageDraft });
  }

  return (
    <article className={`book-card ${layout === "list" ? "row" : ""}`}>
      {/* Cover wrapper with favorite badge */}
      <div 
        className="cover-wrapper clickable-cover" 
        onClick={() => onViewDetails(book)}
        title="Click to view full details"
      >
        <Cover book={book} />
        {book.favorite && (
          <div className="cover-favorite-badge" title="Favorite Book">
            <Heart size={12} fill="currentColor" />
          </div>
        )}
      </div>
      
      <div className="book-main">
        <div className="book-heading">
          <div className="status-chip-row">
            <div className="status-chip" style={{ "--status-color": statusColor }}>
              {StatusIcon && <StatusIcon size={10} />}
              <span>{STATUSES[book.status]?.longLabel}</span>
            </div>
          </div>
          <h3 
            className="book-title clickable-title" 
            title="Click to view full details"
            onClick={() => onViewDetails(book)}
          >
            {book.title}
          </h3>
          <p className="book-author-meta">
            {book.author || "Unknown Author"}
            {book.publishedYear ? ` • ${book.publishedYear}` : ""}
          </p>
        </div>

        <div className="rating-row">
          <Rating value={book.rating} onChange={(rating) => onUpdate(book.id, { rating })} />
          {book.finishedAt ? (
            <span className="finish-date-label">Finished {formatDate(book.finishedAt)}</span>
          ) : null}
        </div>

        {book.tags && book.tags.length ? (
          <div className="tag-row">
            {book.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-badge">{tag}</span>
            ))}
          </div>
        ) : null}

        {book.notes ? (
          <div className="notes-preview-container">
            <button 
              className="read-more-link" 
              onClick={() => onViewDetails(book)}
              title="View full description"
              type="button"
            >
              Read description →
            </button>
          </div>
        ) : null}

        {book.pages ? (
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

        <div className="card-controls">
          <div className="status-select-wrap" style={{ "--border-status": statusColor }}>
            {StatusIcon && <StatusIcon size={12} style={{ color: statusColor }} />}
            <select
              value={book.status}
              onChange={(e) => onUpdate(book.id, { status: e.target.value })}
              aria-label="Change book status"
            >
              {Object.entries(STATUSES).map(([key, status]) => (
                <option key={key} value={key}>
                  {status.longLabel}
                </option>
              ))}
            </select>
          </div>

          {book.pages ? (
            <label className="page-field" title="Update current page">
              <input
                type="number"
                min="0"
                max={book.pages}
                value={pageDraft}
                onChange={(event) => setPageDraft(event.target.value)}
                onBlur={commitPage}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitPage();
                }}
              />
              <span className="page-total">/ {book.pages}</span>
            </label>
          ) : null}
        </div>
      </div>

      {/* Floating Action Drawer overlay */}
      <div className="book-actions">
        <button
          className={book.favorite ? "action-btn active favorite-btn" : "action-btn favorite-btn"}
          onClick={() => onUpdate(book.id, { favorite: !book.favorite })}
          aria-label="Toggle favorite"
          title="Toggle favorite"
          type="button"
        >
          <Heart size={14} fill={book.favorite ? "currentColor" : "none"} />
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(book)}
          aria-label="Edit book"
          title="Edit book"
          type="button"
        >
          <Edit3 size={14} />
        </button>
        <button
          className="action-btn danger delete-btn"
          onClick={() => onDelete(book)}
          aria-label="Remove book"
          title="Remove book"
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

export default BookCard;
