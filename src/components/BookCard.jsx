import React from "react";
import { Trash2, Edit3, Heart, HelpCircle } from "lucide-react";
import Cover from "./Cover";
import { STATUSES, progressFor } from "./constants";

function BookCard({ book, layout, onDelete, onEdit, onUpdate, onViewDetails }) {
  const progress = progressFor(book);
  const statusInfo = STATUSES[book.status] || { label: "Want to read", color: "#6b7280" };
  const StatusIcon = statusInfo.icon || HelpCircle;
  const statusColor = statusInfo.color || "#6b7280";

  if (layout === "list") {
    return (
      <article className="book-card row">
        {/* Cover */}
        <div 
          className="cover-wrapper clickable-cover" 
          onClick={() => onViewDetails(book)}
          title="Click to view details"
        >
          <Cover book={book} />
          {book.favorite && (
            <div className="cover-favorite-badge">
              <Heart size={10} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Book Main contents */}
        <div className="book-main">
          <div className="book-heading">
            <h3 
              className="book-title clickable-title" 
              onClick={() => onViewDetails(book)}
            >
              {book.title}
            </h3>
            <p className="book-author-meta">
              {book.author || "Unknown Author"}
              {book.publishedYear ? ` • ${book.publishedYear}` : ""}
            </p>
          </div>

          {/* Status Pill */}
          <div className="status-pill-column">
            <span className="status-chip" style={{ "--status-color": statusColor }}>
              <StatusIcon size={12} />
              <span>{statusInfo.longLabel || statusInfo.label}</span>
            </span>
          </div>

          {/* Page Progress or Total pages */}
          <div className="progress-column">
            {book.status === "reading" ? (
              <span className="list-progress-text">
                <strong>{book.currentPage || 0}</strong> / {book.pages || 0} pages ({progress}%)
              </span>
            ) : (
              <span className="list-pages-text">
                {book.pages ? `${book.pages} pages` : "No page count"}
              </span>
            )}
          </div>

          {/* Action buttons (Favorite, Edit, Delete) */}
          <div className="book-actions">
            <button
              className={book.favorite ? "action-btn active favorite-btn" : "action-btn favorite-btn"}
              onClick={() => onUpdate(book.id, { favorite: !book.favorite })}
              title="Toggle favorite"
              type="button"
            >
              <Heart size={13} fill={book.favorite ? "currentColor" : "none"} />
            </button>
            <button
              className="action-btn edit-btn"
              onClick={() => onEdit(book)}
              title="Edit book details"
              type="button"
            >
              <Edit3 size={13} />
            </button>
            <button
              className="action-btn danger delete-btn"
              onClick={() => onDelete(book)}
              title="Remove book"
              type="button"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Grid view (compact design)
  return (
    <article className="book-card">
      {/* Cover wrapper with favorite badge */}
      <div 
        className="cover-wrapper clickable-cover" 
        onClick={() => onViewDetails(book)}
        title="Click to view details"
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
          <h3 
            className="book-title clickable-title" 
            onClick={() => onViewDetails(book)}
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="book-author-meta">
            {book.author || "Unknown Author"}
            {book.publishedYear ? ` • ${book.publishedYear}` : ""}
          </p>
        </div>

        {/* Progress Bar ONLY if the status is currently reading */}
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

        {/* Compact status pill at the bottom */}
        <div className="card-status-footer">
          <span className="status-chip" style={{ "--status-color": statusColor }}>
            <StatusIcon size={12} />
            <span>{statusInfo.longLabel || statusInfo.label}</span>
          </span>
        </div>
      </div>

      {/* Floating Action overlay on hover */}
      <div className="book-actions">
        <button
          className={book.favorite ? "action-btn active favorite-btn" : "action-btn favorite-btn"}
          onClick={() => onUpdate(book.id, { favorite: !book.favorite })}
          title="Toggle favorite"
          type="button"
        >
          <Heart size={14} fill={book.favorite ? "currentColor" : "none"} />
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(book)}
          title="Edit book details"
          type="button"
        >
          <Edit3 size={14} />
        </button>
        <button
          className="action-btn danger delete-btn"
          onClick={() => onDelete(book)}
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
