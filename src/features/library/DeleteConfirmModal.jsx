import React, { useState } from "react";
import Button from "../../shared/pk/Button";
import Dialog from "../../shared/pk/Dialog";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useApp, useBooks, useUi } from "../../app/AppContext";

/** "Remove this book?" confirmation. Deleting is permanent, so it asks first. */
function DeleteConfirmModal() {
  const { t } = useLanguage();
  const { deleteConfirmBook: book } = useApp();
  const { closeDeleteConfirm } = useUi();
  const { deleteBook } = useBooks();
  const [busy, setBusy] = useState(false);

  if (!book) return null;

  const confirm = async () => {
    setBusy(true);
    await deleteBook(book);
    setBusy(false);
    closeDeleteConfirm();
  };

  return (
    <Dialog
      size="sm"
      title={t("delete.title")}
      closeLabel={t("action.close")}
      onClose={closeDeleteConfirm}
      footer={
        <>
          <Button variant="ghost" onClick={closeDeleteConfirm}>
            {t("action.cancel")}
          </Button>
          <Button variant="danger" loading={busy} onClick={confirm} data-autofocus>
            {t("delete.confirm")}
          </Button>
        </>
      }
    >
      {t("delete.body", { title: book.title })}
    </Dialog>
  );
}

export default DeleteConfirmModal;
