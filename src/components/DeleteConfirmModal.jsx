import React from "react";

function DeleteConfirmModal({ book, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
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
          <button className="button ghost compact" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="button danger compact" onClick={onConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
