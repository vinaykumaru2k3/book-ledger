import React, { useState, useMemo } from "react";
import { Plus, Trash2, FolderOpen, X, Layers } from "lucide-react";
import Cover from "./Cover";

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

function ShelvesDashboard({ books, onUpdateBook, onViewDetails }) {
  const [newShelfName, setNewShelfName] = useState("");
  const [tempEmptyShelves, setTempEmptyShelves] = useState([]);

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

  const allShelves = useMemo(() => {
    const set = new Set([...uniqueShelves, ...tempEmptyShelves]);
    return Array.from(set).sort();
  }, [uniqueShelves, tempEmptyShelves]);

  const handleAddShelf = (e) => {
    e.preventDefault();
    const name = newShelfName.trim();
    if (name && !allShelves.includes(name)) {
      setTempEmptyShelves((prev) => [...prev, name]);
      setNewShelfName("");
    }
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
    
    // Remove from temp empty shelves if present
    setTempEmptyShelves((prev) => prev.filter((s) => s !== shelfName));
  };

  const handleRemoveBookFromShelf = async (book, shelfName) => {
    const updatedShelves = (book.shelves || []).filter((s) => s !== shelfName);
    await onUpdateBook(book.id, { shelves: updatedShelves });
  };

  return (
    <div className="shelves-dashboard">
      <div className="dashboard-header">
        <div>
          <span className="section-kicker">Workspace</span>
          <h2>Custom Shelves & Collections</h2>
        </div>
        
        <form className="add-board-form" onSubmit={handleAddShelf}>
          <input
            type="text"
            placeholder="New Collection Board name..."
            value={newShelfName}
            onChange={(e) => setNewShelfName(e.target.value)}
          />
          <button className="button primary compact" type="submit">
            <Plus size={16} />
            <span>Create Board</span>
          </button>
        </form>
      </div>

      {allShelves.length === 0 ? (
        <div className="empty-dashboard-state">
          <FolderOpen size={48} />
          <h3>No collections created yet</h3>
          <p>Type a collection name above to create your first visual board, or use the quick shelf tool on any book card!</p>
        </div>
      ) : (
        <div className="boards-grid">
          {allShelves.map((shelf) => {
            const list = shelfBooks[shelf] || [];
            const preset = getPreset(shelf);
            
            return (
              <div key={shelf} className={`shelf-board-card ${preset.class}`}>
                <div className="board-card-header">
                  <div className="board-title-group">
                    <Layers size={16} style={{ color: preset.color }} />
                    <h3>{shelf}</h3>
                    <span className="board-count-badge">{list.length} {list.length === 1 ? "book" : "books"}</span>
                  </div>
                  <button 
                    className="delete-board-btn" 
                    onClick={() => handleDeleteShelf(shelf)}
                    title="Delete this shelf board"
                    aria-label="Delete shelf board"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="board-books-track">
                  {list.length === 0 ? (
                    <div className="empty-board-track">
                      <span>No books on this shelf yet. Use the card quick-shelf tool to add books!</span>
                    </div>
                  ) : (
                    list.map((book) => (
                      <div key={book.id} className="board-book-item">
                        <div className="board-book-cover-wrap">
                          <div 
                            className="clickable-cover"
                            onClick={() => onViewDetails(book)}
                            title={`View details: ${book.title}`}
                          >
                            <Cover book={book} />
                          </div>
                          <button
                            className="remove-book-from-shelf-btn"
                            onClick={() => handleRemoveBookFromShelf(book, shelf)}
                            title={`Remove from ${shelf}`}
                            aria-label="Remove book from shelf"
                            type="button"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <span className="board-book-title" title={book.title}>{book.title}</span>
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
