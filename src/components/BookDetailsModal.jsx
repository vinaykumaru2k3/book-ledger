import React, { useState, useEffect } from "react";
import { X, Calendar, Bookmark, Layers, Heart, BookOpen, Tag, Loader2 } from "lucide-react";
import Cover from "./Cover";
import Rating from "./Rating";
import { STATUSES, progressFor } from "./constants";

function BookDetailsModal({ book, onClose }) {
  const progress = progressFor(book);
  const StatusIcon = STATUSES[book.status]?.icon;
  const statusColor = STATUSES[book.status]?.color || "#10b981";

  const isPlaceholder = book.description === "Fetching full description from Open Library...";
  
  const [description, setDescription] = useState(isPlaceholder ? "" : book.description || "");
  const [loadingDesc, setLoadingDesc] = useState(
    isPlaceholder || (!book.description && (book.sourceKey?.startsWith("/works/") || book.id?.startsWith("/works/")))
  );

  useEffect(() => {
    let active = true;
    const workKey = book.sourceKey || (book.id?.startsWith("/works/") ? book.id : null);
    
    if (loadingDesc && workKey) {
      async function fetchDesc() {
        try {
          const response = await fetch(`https://openlibrary.org${workKey}.json`);
          if (response.ok && active) {
            const data = await response.json();
            let desc = "";
            if (typeof data.description === "string") {
              desc = data.description;
            } else if (data.description && typeof data.description.value === "string") {
              desc = data.description.value;
            }
            setDescription(desc || "No description available for this book.");
          }
        } catch (e) {
          console.error("Failed to fetch OL description in details:", e);
          if (active) setDescription("Failed to load description.");
        } finally {
          if (active) setLoadingDesc(false);
        }
      }
      fetchDesc();
    }
    return () => {
      active = false;
    };
  }, [book, loadingDesc]);

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
              const displayDescription = description || (hasAPI ? book.notes : "");
              const displayNotes = description ? book.notes : (hasAPI ? "" : book.notes);

              return (
                <>
                  <div className="details-description-section">
                    <h3 className="details-section-label">About This Book</h3>
                    <div className="details-description-text">
                      {loadingDesc ? (
                        <div className="desc-loading-inline">
                          <Loader2 size={16} className="spin" style={{ marginRight: 6 }} />
                          <span>Fetching synopsis from Open Library...</span>
                        </div>
                      ) : displayDescription ? (
                        <p>{displayDescription}</p>
                      ) : (
                        <p className="empty-desc">No description available for this book.</p>
                      )}
                    </div>
                  </div>

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
