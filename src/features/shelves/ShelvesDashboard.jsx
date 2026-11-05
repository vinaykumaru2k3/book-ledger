import React, { useState } from "react";
import { Trash2, FolderOpen, X, Layers, Edit2, Check, ArrowLeft } from "lucide-react";
import Cover from "../../shared/ui/Cover";
import BookTile from "../library/BookTile";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useShelves } from "../../app/AppContext";

function ShelvesDashboard() {
  const { uniqueShelves, shelfBooks, getPreset, renameShelf, deleteShelf } = useShelves();
  const [activeShelf, setActiveShelf] = useState(null);
  const [editingShelf, setEditingShelf] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // shelf name awaiting confirmation

  const handleRenameShelf = async (e, oldName) => {
    e.preventDefault();
    const newName = editNameValue.trim();
    if (!newName || newName === oldName) {
      setEditingShelf(null);
      return;
    }

    const renamed = await renameShelf(oldName, newName);
    if (!renamed) return;

    // Update active shelf name if active
    if (activeShelf === oldName) {
      setActiveShelf(newName);
    }

    setEditingShelf(null);
  };

  const handleDeleteShelf = (shelfName) => setPendingDelete(shelfName);

  const confirmDelete = async () => {
    const shelfName = pendingDelete;
    setPendingDelete(null);
    await deleteShelf(shelfName);
    if (activeShelf === shelfName) setActiveShelf(null);
  };

  const confirmDialog = pendingDelete && (
    <ConfirmDialog
      title="Delete Shelf"
      tone="danger"
      confirmLabel="Delete"
      onCancel={() => setPendingDelete(null)}
      onConfirm={confirmDelete}
    >
      Delete the shelf <strong>{pendingDelete}</strong>? Its books stay in your library; they are just removed from this shelf.
    </ConfirmDialog>
  );

  // If a shelf is clicked and opened, render the full grid view of books on that shelf
  if (activeShelf) {
    const list = shelfBooks[activeShelf] || [];
    const preset = getPreset(activeShelf);
    const isEditing = editingShelf === activeShelf;

    return (
      <>
      {confirmDialog}
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
          <div className="book-grid-layout">
            <div className="pk-tiles">
              {list.map((book) => (
                <BookTile key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  return (
    <>
    {confirmDialog}
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
    </>
  );
}

export default ShelvesDashboard;
