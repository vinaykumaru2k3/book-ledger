import React from "react";
import Modal from "./Modal";
import Button from "./Button";

/** Small yes/no dialog. `tone="danger"` styles the confirm button as destructive. */
function ConfirmDialog({ title, children, confirmLabel = "Confirm", tone = "primary", onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} className="confirm-modal" labelledBy="confirm-title">
      <h2 className="confirm-title" id="confirm-title">
        {title}
      </h2>
      <p className="confirm-text">{children}</p>
      <div className="confirm-actions">
        <Button compact onClick={onCancel}>
          Cancel
        </Button>
        <Button compact variant={tone} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
