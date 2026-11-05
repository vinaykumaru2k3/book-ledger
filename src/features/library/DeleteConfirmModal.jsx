import React from "react";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useApp, useBooks, useUi } from "../../app/AppContext";

function DeleteConfirmModal() {
  const { deleteConfirmBook: book } = useApp();
  const { closeDeleteConfirm } = useUi();
  const { deleteBook } = useBooks();

  if (!book) return null;

  return (
    <ConfirmDialog
      title="Remove Book"
      tone="danger"
      confirmLabel="Delete"
      onCancel={closeDeleteConfirm}
      onConfirm={async () => {
        await deleteBook(book);
        closeDeleteConfirm();
      }}
    >
      Are you sure you want to remove <strong>{book.title}</strong>? This action is permanent.
    </ConfirmDialog>
  );
}

export default DeleteConfirmModal;
