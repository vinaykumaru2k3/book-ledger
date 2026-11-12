import React, { useMemo } from "react";
import Button from "../../../shared/pk/Button";
import Dialog from "../../../shared/pk/Dialog";
import { findDuplicate, shelvesOf } from "../../../domain/library";
import { mergeLookupIntoForm } from "../../../domain/book";
import { buildFormFromVolume } from "../../../services/bookApi";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useBooks, useModal } from "../../../app/AppContext";
import BookLookup from "./BookLookup";
import BookFormFields from "./BookFormFields";
import DuplicateWarning from "./DuplicateWarning";

const FORM_ID = "book-form";

/**
 * Add / edit dialog. This component only wires things together:
 * lookup (search the catalogues) → fields (edit) → save (via the modal context).
 * A click outside never closes it, so half-typed input is not lost by accident.
 */
function BookFormModal() {
  const { t } = useLanguage();
  const { books } = useBooks();
  const { editing, form, onFormChange, onSubmit, onClose, quickAdd } = useModal();

  const shelfOptions = useMemo(() => shelvesOf([...books, { shelves: form?.shelves }]), [books, form?.shelves]);
  const duplicate = useMemo(
    () => (form && !editing ? findDuplicate(books, form) : null),
    [books, editing, form?.sourceKey, form?.title, form?.author] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!form) return null;

  const patch = (changes) => onFormChange((current) => ({ ...current, ...changes }));
  const fillFromVolume = async (volume) => {
    const lookup = await buildFormFromVolume(volume);
    onFormChange((current) => mergeLookupIntoForm(current, lookup));
  };
  const quickAddVolume = async (volume) => quickAdd(await buildFormFromVolume(volume));

  return (
    <Dialog
      size="lg"
      title={editing ? t("form.editTitle") : t("form.addTitle")}
      closeLabel={t("action.close")}
      closeOnBackdrop={false}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID}>
            {editing ? t("form.saveChanges") : t("form.save")}
          </Button>
        </>
      }
    >
      {!editing && <BookLookup books={books} onFill={fillFromVolume} onQuickAdd={quickAddVolume} />}
      {duplicate && <DuplicateWarning book={duplicate} />}

      <form id={FORM_ID} className="pk-form" onSubmit={onSubmit}>
        <BookFormFields form={form} patch={patch} shelfOptions={shelfOptions} editing={editing} focusTitle={editing} />
      </form>
    </Dialog>
  );
}

export default BookFormModal;
