import React from "react";
import { useApp, useUi, useBooks } from "../context/AppContext";


function DeleteConfirmModal() {
  const { deleteConfirmBook: book, setDeleteConfirmBook } = useApp();
  const { closeDeleteConfirm } = useUi();
  const { deleteBook } = useBooks();

  const handleClose = closeDeleteConfirm || (() => setDeleteConfirmBook?.(null));

  if (!book) return null;

  const handleConfirm = async () => {
    await deleteBook(book);
    handleClose();
  };

  return (

    <div className="modal-backdrop" onClick={handleClose}>
      <div 
        className="modal confirm-modal" 
        role="dialog" 
        aria-modal="true" 
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-title">Remove Book</h2>
        <p className="confirm-text">
          Are you sure you want to remove <strong>{book.title}</strong>? This action is permanent.
        </p>
        <div className="confirm-actions">

          <button className="button ghost compact" onClick={handleClose} type="button">
            Cancel
          </button>

          <button className="button danger compact" onClick={handleConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;

