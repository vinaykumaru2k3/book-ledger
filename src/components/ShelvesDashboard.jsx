import React, { useState, useMemo } from "react";
import { Trash2, FolderOpen, X, Layers, Edit2, Check, ArrowLeft } from "lucide-react";
import Cover from "./Cover";
import BookCard from "./BookCard";

const BOARD_PRESETS = [
  { class: "shelf-board-sepia", color: "#d97706" },
  { class: "shelf-board-cosmic", color: "#6366f1" },
  { class: "shelf-board-botanical", color: "#10b981" },
  { class: "shelf-board-crimson", color: "#ef4444" },
  { class: "shelf-board-amber", color: "#f59e0b" },
  { class: "shelf-board-teal", color: "#14b8a6" }
];

function getPreset(shelfName) {
  const codeSum = shelfName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BOARD_PRESETS[codeSum % BOARD_PRESETS.length];
}

function ShelvesDashboard({ books, onUpdateBook, onViewDetails, onDeleteBook, onEditBook }) {
  const [activeShelf, setActiveShelf] = useState(null);
  const [editingShelf, setEditingShelf] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");

  // Extract unique shelves
  const uniqueShelves = useMemo(() => {
    const list = new Set();
    books.forEach((book) => {
      if (Array.isArray(book.shelves)) {
        book.shelves.forEach((s) => list.add(s));
      }
    });
    return Array.from(list).sort();
  }, [books]);

  // Group books by shelf
  const shelfBooks = useMemo(() => {
    const map = {};
    books.forEach((book) => {
      if (Array.isArray(book.shelves)) {
        book.shelves.forEach((shelf) => {
          if (!map[shelf]) map[shelf] = [];
          map[shelf].push(book);
        });
      }
    });
    return map;
  }, [books]);

  const handleRenameShelf = async (e, oldName) => {
    e.preventDefault();
    const newName = editNameValue.trim();
    if (!newName || newName === oldName) {
      setEditingShelf(null);
      return;
    }

    if (uniqueShelves.includes(newName) && newName !== oldName) {
      alert("A shelf board with this name already exists!");
      return;
    }

    // Rename oldName to newName in all books
    const booksOnShelf = shelfBooks[oldName] || [];
    for (const book of booksOnShelf) {
      const updatedShelves = (book.shelves || []).map((s) => s === oldName ? newName : s);
      await onUpdateBook(book.id, { shelves: updatedShelves });
    }

    // Update active shelf name if active
    if (activeShelf === oldName) {
      setActiveShelf(newName);
    }

    setEditingShelf(null);
  };

  const handleDeleteShelf = async (shelfName) => {
    if (!window.confirm(`Are you sure you want to delete the shelf board "${shelfName}"? This will unshelf all books on this board.`)) {
      return;
    }
    
    // Remove shelfName from all books' shelves
    const booksOnShelf = shelfBooks[shelfName] || [];
    for (const book of booksOnShelf) {
      const updatedShelves = (book.shelves || []).filter((s) => s !== shelfName);
      await onUpdateBook(book.id, { shelves: updatedShelves });
    }

    if (activeShelf === shelfName) {
      setActiveShelf(null);
    }
  };

  // If a shelf is clicked and opened, render the full grid view of books on that shelf
  if (activeShelf) {
    const list = shelfBooks[activeShelf] || [];
    const preset = getPreset(activeShelf);
    const isEditing = editingShelf === activeShelf;

    return (
      <div className="active-shelf-workspace">
        <div className="active-shelf-header">
          <button 
            className="back-to-shelves-btn"
            onClick={() => {
              setActiveShelf(null);
              setEditingShelf(null);
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Shelves</span>
          </button>

          <div className="active-shelf-meta">
            {isEditing ? (
              <form onSubmit={(e) => handleRenameShelf(e, activeShelf)} className="rename-shelf-form">
                <input
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="rename-shelf-input"
                  autoFocus
                  required
                />
                <button type="submit" className="rename-btn save-btn" title="Save name">
                  <Check size={14} />
                </button>
                <button type="button" className="rename-btn cancel-btn" onClick={() => setEditingShelf(null)} title="Cancel">
                  <X size={14} />
                </button>
              </form>
            ) : (
              <div className="board-title-group">
                <Layers size={20} style={{ color: preset.color }} />
                <h2>{activeShelf}</h2>
                <button
                  className="edit-shelf-btn"
                  onClick={() => {
                    setEditingShelf(activeShelf);
                    setEditNameValue(activeShelf);
                  }}
                  title="Rename Shelf Board"
                  type="button"
                >
                  <Edit2 size={14} />
                </button>
                <span className="board-count-badge">
                  {list.length} {list.length === 1 ? "book" : "books"}
                </span>
              </div>
            )}

            {!isEditing && (
              <button 
                className="delete-shelf-board-action" 
                onClick={async () => {
                  await handleDeleteShelf(activeShelf);
                }}
                title="Delete this shelf board"
                type="button"
              >
                <Trash2 size={14} />
                <span>Delete Board</span>
              </button>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="empty-dashboard-state">
            <FolderOpen size={48} />
            <h3>This shelf is empty</h3>
            <p>Go back to the library view and use the folder icon on any book card to add books here!</p>
          </div>
        ) : (
          <div className="books-grid-layout">
            <div className="books-grid">
              {list.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  layout="grid"
                  uniqueShelves={uniqueShelves}
                  onDelete={onDeleteBook}
                  onEdit={onEditBook}
                  onUpdate={onUpdateBook}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shelves-dashboard">
      <div className="dashboard-intro-row">
        <div className="intro-info">
          <span className="section-kicker">Visual Boards</span>
          <p className="intro-description">
            Organize your library collections. Click on any shelf board below to open it and view/manage all of its books in a full grid.
          </p>
        </div>
      </div>

      {uniqueShelves.length === 0 ? (
        <div className="empty-dashboard-state">
          <FolderOpen size={48} />
          <h3>No collections created yet</h3>
          <p>Organize books directly from their cards using the quick-shelve folder icon to see them here!</p>
        </div>
      ) : (
        <div className="boards-grid">
          {uniqueShelves.map((shelf) => {
            const list = shelfBooks[shelf] || [];
            const preset = getPreset(shelf);
            const isEditing = editingShelf === shelf;
            
            return (
              <div 
                key={shelf} 
                className={`shelf-board-card clickable-board ${preset.class}`}
                onClick={() => {
                  setActiveShelf(shelf);
                }}
              >
                <div className="board-card-header" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <form onSubmit={(e) => handleRenameShelf(e, shelf)} className="rename-shelf-form">
                      <input
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="rename-shelf-input"
                        autoFocus
                        required
                      />
                      <button type="submit" className="rename-btn save-btn" title="Save name">
                        <Check size={14} />
                      </button>
                      <button type="button" className="rename-btn cancel-btn" onClick={() => setEditingShelf(null)} title="Cancel">
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <div className="board-title-group">
                      <Layers size={16} style={{ color: preset.color }} />
                      <h3 onDoubleClick={() => {
                        setEditingShelf(shelf);
                        setEditNameValue(shelf);
                      }}>
                        {shelf}
                      </h3>
                      <button
                        className="edit-shelf-btn"
                        onClick={() => {
                          setEditingShelf(shelf);
                          setEditNameValue(shelf);
                        }}
                        title="Rename Shelf Board"
                        type="button"
                      >
                        <Edit2 size={12} />
                      </button>
                      <span className="board-count-badge">
                        {list.length} {list.length === 1 ? "book" : "books"}
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <button 
                      className="delete-board-btn" 
                      onClick={() => handleDeleteShelf(shelf)}
                      title="Delete this shelf board"
                      aria-label="Delete shelf board"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Overlapping cover fan preview area */}
                <div className="board-preview-covers">
                  {list.length === 0 ? (
                    <div className="empty-board-track">
                      <span>Empty collection. Click to open and add books.</span>
                    </div>
                  ) : (
                    list.slice(0, 5).map((book, idx) => (
                      <div 
                        key={book.id} 
                        className="preview-cover-item"
                        style={{ zIndex: idx + 1 }}
                      >
                        <Cover book={book} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ShelvesDashboard;
