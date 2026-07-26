import React, { useState } from "react";
import { Trash2, Edit3, Heart, HelpCircle, FolderPlus, Plus, Check } from "lucide-react";
import Cover from "./Cover";
import { STATUSES, progressFor } from "./constants";
import { useBooks, useUi, useShelves } from "../context/AppContext";

function BookCard({ book, layout }) {
  const [showShelfPopover, setShowShelfPopover] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");
  const { updateBook, deleteBook } = useBooks();
  const { openEditBook, openDetails, openDeleteConfirm } = useUi();
  const { uniqueShelves } = useShelves();
  
  const handleDelete = (b) => {
    if (openDeleteConfirm) {
      openDeleteConfirm(b);
    } else {
      deleteBook(b);
    }
  };
  
  const progress = progressFor(book);
  const statusInfo = STATUSES[book.status] || { label: "Want to read", color: "#6b7280" };
  const StatusIcon = statusInfo.icon || HelpCircle;
  const statusColor = statusInfo.color || "#6b7280";

  const handleToggleShelf = (shelf) => {
    const current = book.shelves || [];
    const nextShelves = current.includes(shelf)
      ? current.filter((s) => s !== shelf)
      : [...current, shelf];
    updateBook(book.id, { shelves: nextShelves });
  };

  const handleAddShelf = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = newShelfName.trim();
    if (name) {
      const current = book.shelves || [];
      if (!current.includes(name)) {
        updateBook(book.id, { shelves: [...current, name] });
      }
      setNewShelfName("");
    }
  };

  const currentShelves = book.shelves || [];

  const shelfPopover = showShelfPopover && (
    <>
      <div 
        className="popover-backdrop" 
        onClick={(e) => {
          e.stopPropagation();
          setShowShelfPopover(false);
        }} 
      />
      <div className="card-shelf-popover" onClick={(e) => e.stopPropagation()}>
        <div className="popover-title">Add to Collections</div>
        
        <div className="popover-checklist">
          {uniqueShelves.length === 0 ? (
            <span className="popover-empty-text">No collections created yet.</span>
          ) : (
            uniqueShelves.map((shelf) => {
              const isChecked = currentShelves.includes(shelf);
              return (
                <button
                  type="button"
                  key={shelf}
                  className={`popover-check-row ${isChecked ? "active" : ""}`}
                  onClick={() => handleToggleShelf(shelf)}
                >
                  <span className={`popover-checkbox ${isChecked ? "checked" : ""}`}>
                    {isChecked && <Check size={10} />}
                  </span>
                  <span className="popover-shelf-name">{shelf}</span>
                </button>
              );
            })
          )}
        </div>
        
        <form className="popover-add-form" onSubmit={handleAddShelf}>
          <input
            type="text"
            placeholder="New shelf..."
            value={newShelfName}
            onChange={(e) => setNewShelfName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <button type="submit" className="popover-add-btn" title="Create and add to shelf">
            <Plus size={12} />
          </button>
        </form>
      </div>
    </>
  );

  if (layout === "list") {
    return (
      <article className="book-card row">
        {/* Cover */}
        <div 
          className="cover-wrapper clickable-cover" 
          onClick={() => openDetails(book)}
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
              onClick={() => openDetails(book)}
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

          {/* Action buttons (Favorite, Shelve, Edit, Delete) */}
          <div className={`book-actions ${showShelfPopover ? "open" : ""}`}>
            <button
              className={book.favorite ? "action-btn active favorite-btn" : "action-btn favorite-btn"}
              onClick={() => updateBook(book.id, { favorite: !book.favorite })}
              title="Toggle favorite"
              type="button"
            >
              <Heart size={13} fill={book.favorite ? "currentColor" : "none"} />
            </button>
            <button
              className={showShelfPopover ? "action-btn active shelve-btn" : "action-btn shelve-btn"}
              onClick={() => setShowShelfPopover(!showShelfPopover)}
              title="Quick Shelve"
              type="button"
            >
              <FolderPlus size={13} />
            </button>
            <button
              className="action-btn edit-btn"
              onClick={() => openEditBook(book)}
              title="Edit book details"
              type="button"
            >
              <Edit3 size={13} />
            </button>
            <button
              className="action-btn danger delete-btn"
              onClick={() => handleDelete(book)}
              title="Remove book"
              type="button"
            >
              <Trash2 size={13} />
            </button>
            {shelfPopover}
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
        onClick={() => openDetails(book)}
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
            onClick={() => openDetails(book)}
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
      <div className={`book-actions ${showShelfPopover ? "open" : ""}`}>
        <button
          className={book.favorite ? "action-btn active favorite-btn" : "action-btn favorite-btn"}
          onClick={() => updateBook(book.id, { favorite: !book.favorite })}
          title="Toggle favorite"
          type="button"
        >
          <Heart size={14} fill={book.favorite ? "currentColor" : "none"} />
        </button>
        <button
          className={showShelfPopover ? "action-btn active shelve-btn" : "action-btn shelve-btn"}
          onClick={() => setShowShelfPopover(!showShelfPopover)}
          title="Quick Shelve"
          type="button"
        >
          <FolderPlus size={14} />
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => openEditBook(book)}
          title="Edit book details"
          type="button"
        >
          <Edit3 size={14} />
        </button>
        <button
          className="action-btn danger delete-btn"
          onClick={() => handleDelete(book)}
          title="Remove book"
          type="button"
        >
          <Trash2 size={14} />
        </button>
        {shelfPopover}
      </div>
    </article>
  );
}

export default BookCard;
