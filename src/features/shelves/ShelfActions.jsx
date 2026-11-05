import React, { useState } from "react";
import { Edit2, Ellipsis, Trash2 } from "lucide-react";
import Button from "../../shared/pk/Button";
import Dialog from "../../shared/pk/Dialog";
import Field from "../../shared/pk/Field";
import Menu from "../../shared/pk/Menu";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useShelves } from "../../app/AppContext";

/**
 * Rename / delete menu for the shelf you are looking at. A shelf is only a name
 * stored on books, so both actions rewrite those books in one batched write.
 * `onRenamed(newName)` and `onDeleted()` let the caller move to the right page.
 */
function ShelfActions({ name, onRenamed, onDeleted }) {
  const { t } = useLanguage();
  const { renameShelf, deleteShelf } = useShelves();
  const [dialog, setDialog] = useState(null); // "rename" | "delete" | null
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);

  const close = () => setDialog(null);

  const submitRename = async (event) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === name) return close();
    setBusy(true);
    const renamed = await renameShelf(name, next);
    setBusy(false);
    if (renamed) {
      close();
      onRenamed(next);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    await deleteShelf(name);
    setBusy(false);
    close();
    onDeleted();
  };

  return (
    <>
      <Menu
        label={t("shelf.options")}
        triggerClassName="pk-icon-btn pk-shelf-menu"
        trigger={<Ellipsis size={20} aria-hidden="true" />}
        items={[
          {
            id: "rename",
            label: t("shelf.rename"),
            icon: Edit2,
            onSelect: () => {
              setDraft(name);
              setDialog("rename");
            },
          },
          { id: "delete", label: t("shelf.delete"), icon: Trash2, tone: "danger", onSelect: () => setDialog("delete") },
        ]}
      />

      {dialog === "rename" && (
        <Dialog
          size="sm"
          title={t("shelf.rename")}
          closeLabel={t("action.close")}
          onClose={close}
          footer={
            <>
              <Button variant="ghost" onClick={close}>
                {t("action.cancel")}
              </Button>
              <Button variant="primary" type="submit" form="rename-shelf-form" loading={busy}>
                {t("action.save")}
              </Button>
            </>
          }
        >
          <form id="rename-shelf-form" onSubmit={submitRename}>
            <Field label={t("shelf.nameLabel")} value={draft} onChange={(event) => setDraft(event.target.value)} required data-autofocus />
          </form>
        </Dialog>
      )}

      {dialog === "delete" && (
        <Dialog
          size="sm"
          title={t("shelf.deleteTitle")}
          closeLabel={t("action.close")}
          onClose={close}
          footer={
            <>
              <Button variant="ghost" onClick={close}>
                {t("action.cancel")}
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={busy} data-autofocus>
                {t("shelf.confirmDelete")}
              </Button>
            </>
          }
        >
          {t("shelf.deleteBody", { name })}
        </Dialog>
      )}
    </>
  );
}

export default ShelfActions;
