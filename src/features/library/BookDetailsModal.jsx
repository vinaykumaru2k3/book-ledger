import React from "react";
import { X, Calendar, Bookmark, Layers, Heart, BookOpen, Tag, Loader2 } from "lucide-react";
import Modal from "../../shared/ui/Modal";
import Cover from "../../shared/ui/Cover";
import Rating from "../../shared/ui/Rating";
import { STATUSES, progressFor } from "../../domain/status";
import { useApp, useUi } from "../../app/AppContext";
import { useBookDescription } from "./useBookDescription";

function ChipSection({ label, icon: Icon, items, rowClass, chipClass, sectionClass }) {
  if (!items?.length) return null;
  return (
    <div className={sectionClass}>
      <span className="details-section-label">
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <div className={rowClass}>
        {items.map((item) => (
          <span key={item} className={chipClass}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function TextSection({ title, children }) {
  return (
    <div className="details-description-section">
      <h3 className="details-section-label">{title}</h3>
      <div className="details-description-text">{children}</div>
    </div>
  );
}

function BookDetailsModal() {
  const { detailsBook: book } = useApp();
  const { closeDetails } = useUi();
  if (!book) return null;
  return <BookDetails book={book} onClose={closeDetails} />;
}

function BookDetails({ book, onClose }) {
  const { description, loading } = useBookDescription(book);
  const progress = progressFor(book);
  const status = STATUSES[book.status];
  const StatusIcon = status?.icon;
  const statusColor = status?.color || "#10b981";

  return (
    <Modal onClose={onClose} className="details-modal">
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
            <span>{status?.longLabel}</span>
          </div>

          {book.pages ? (
            <div className="details-progress-card">
              <div className="details-progress-header">
                <strong>{progress}% Read</strong>
                <span>
                  {book.currentPage} / {book.pages} pages
                </span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress}%`, backgroundColor: statusColor }} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="details-info-column">
          <div className="details-title-heading">
            <h1 className="details-title">{book.title}</h1>
            <p className="details-author">by {book.author || "Unknown Author"}</p>
          </div>

          <div className="details-meta-grid">
            {book.publishedYear && (
              <div className="details-meta-item">
                <Calendar size={14} />
                <span>
                  Published: <strong>{book.publishedYear}</strong>
                </span>
              </div>
            )}
            {book.isbn && (
              <div className="details-meta-item">
                <Bookmark size={14} />
                <span>
                  ISBN: <strong>{book.isbn}</strong>
                </span>
              </div>
            )}
            {book.pages ? (
              <div className="details-meta-item">
                <BookOpen size={14} />
                <span>
                  Length: <strong>{book.pages} pages</strong>
                </span>
              </div>
            ) : null}
          </div>

          <div className="details-rating-section">
            <span className="details-section-label">Your Review:</span>
            <Rating value={book.rating} readonly />
          </div>

          <ChipSection
            label="Genres:"
            icon={Tag}
            items={book.genres}
            sectionClass="details-genres-section"
            rowClass="genre-row"
            chipClass="genre-chip"
          />
          <ChipSection
            label="Tags:"
            items={book.tags}
            sectionClass="details-tags-section"
            rowClass="tag-row"
            chipClass="tag-badge"
          />

          <TextSection title="About This Book">
            {loading ? (
              <div className="desc-loading-inline">
                <Loader2 size={16} className="spin" style={{ marginRight: 6 }} />
                <span>Fetching synopsis from Open Library...</span>
              </div>
            ) : description ? (
              <p>{description}</p>
            ) : (
              <p className="empty-desc">No description available for this book.</p>
            )}
          </TextSection>

          <TextSection title="Personal Notes">
            {book.notes ? (
              <p>{book.notes}</p>
            ) : (
              <p className="empty-desc">No personal notes or review logged for this book yet.</p>
            )}
          </TextSection>
        </div>
      </div>
    </Modal>
  );
}

export default BookDetailsModal;
