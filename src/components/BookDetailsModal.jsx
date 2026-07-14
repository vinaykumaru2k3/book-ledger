import React from "react";
import { X, Calendar, Bookmark, Layers, Heart, BookOpen, Tag } from "lucide-react";
import Cover from "./Cover";
import Rating from "./Rating";
import { STATUSES, progressFor } from "./constants";

function BookDetailsModal({ book, onClose }) {
  const progress = progressFor(book);
  const StatusIcon = STATUSES[book.status]?.icon;
  const statusColor = STATUSES[book.status]?.color || "#10b981";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal details-modal" 
        role="dialog" 
        aria-modal="true" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="details-modal-header">
          <div className="details-header-title">
            <Layers size={16} />
            <span>Book Profile</span>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close" title="Close details" type="button">
            <X size={19} />
          </button>
        </div>

        <div className="details-modal-body">
          {/* Left Column - Large Cover Art */}
          <div className="details-cover-column">
            <div className="details-cover-wrap">
              <Cover book={book} />
              {book.favorite && (
                <div className="cover-favorite-badge" title="Favorite Book">
                  <Heart size={12} fill="currentColor" />
                </div>
              )}
            </div>
            
            <div className="details-status-badge" style={{ "--status-color": statusColor }}>
              {StatusIcon && <StatusIcon size={12} />}
              <span>{STATUSES[book.status]?.longLabel}</span>
            </div>
            
            {book.pages ? (
              <div className="details-progress-card">
                <div className="details-progress-header">
                  <strong>{progress}% Read</strong>
                  <span>{book.currentPage} / {book.pages} pages</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%`, backgroundColor: statusColor }} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column - Book Details & Description */}
          <div className="details-info-column">
            <div className="details-title-heading">
              <h1 className="details-title">{book.title}</h1>
              <p className="details-author">by {book.author || "Unknown Author"}</p>
            </div>

            <div className="details-meta-grid">
              {book.publishedYear && (
                <div className="details-meta-item">
                  <Calendar size={14} />
                  <span>Published: <strong>{book.publishedYear}</strong></span>
                </div>
              )}
              {book.isbn && (
                <div className="details-meta-item">
                  <Bookmark size={14} />
                  <span>ISBN: <strong>{book.isbn}</strong></span>
                </div>
              )}
              {book.pages ? (
                <div className="details-meta-item">
                  <BookOpen size={14} />
                  <span>Length: <strong>{book.pages} pages</strong></span>
                </div>
              ) : null}
            </div>

            <div className="details-rating-section">
              <span className="details-section-label">Your Review:</span>
              <Rating value={book.rating} readonly />
            </div>

            {book.genres && book.genres.length > 0 && (
              <div className="details-genres-section">
                <span className="details-section-label">
                  <Tag size={13} />
                  Genres:
                </span>
                <div className="genre-row">
                  {book.genres.map((genre) => (
                    <span key={genre} className="genre-chip">{genre}</span>
                  ))}
                </div>
              </div>
            )}

            {book.tags && book.tags.length > 0 && (
              <div className="details-tags-section">
                <span className="details-section-label">Tags:</span>
                <div className="tag-row">
                  {book.tags.map((tag) => (
                    <span key={tag} className="tag-badge">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Smart fallback: if it has an API key but no description field, treat notes as description */}
            {(() => {
              const hasAPI = Boolean(book.sourceKey);
              const displayDescription = book.description || (hasAPI ? book.notes : "");
              const displayNotes = book.description ? book.notes : (hasAPI ? "" : book.notes);

              return (
                <>
                  {displayDescription ? (
                    <div className="details-description-section">
                      <h3 className="details-section-label">About This Book</h3>
                      <div className="details-description-text">
                        <p>{displayDescription}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="details-description-section">
                    <h3 className="details-section-label">Personal Notes</h3>
                    <div className="details-description-text">
                      {displayNotes ? (
                        <p>{displayNotes}</p>
                      ) : (
                        <p className="empty-desc">No personal notes or review logged for this book yet.</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetailsModal;
