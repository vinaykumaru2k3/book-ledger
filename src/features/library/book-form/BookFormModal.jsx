import React, { useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import Modal from "../../../shared/ui/Modal";
import Button from "../../../shared/ui/Button";
import { findDuplicate, shelvesOf } from "../../../domain/library";
import { mergeLookupIntoForm } from "../../../domain/book";
import { buildFormFromVolume } from "../../../services/bookApi";
import { useBooks, useModal } from "../../../app/AppContext";
import BookLookup from "./BookLookup";
import BookFormFields from "./BookFormFields";
import DuplicateWarning from "./DuplicateWarning";

/**
 * Add / edit dialog. This component only wires things together:
 * lookup (search the catalogues) → fields (edit) → save (via the modal context).
 */
function BookFormModal() {
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
    <Modal onClose={onClose} onBackdropClick={() => {}} labelledBy="book-modal-title">
      <div className="modal-header">
        <div>
          <p className="section-kicker">{editing ? "Update Ledger" : "New Addition"}</p>
          <h2 id="book-modal-title">{editing ? "Modify Book Details" : "Add to Library"}</h2>
        </div>
        <button className="icon-button close-btn" onClick={onClose} aria-label="Close" title="Close" type="button">
          <X size={19} />
        </button>
      </div>

      {!editing && <BookLookup books={books} onFill={fillFromVolume} onQuickAdd={quickAddVolume} />}
      {duplicate && <DuplicateWarning book={duplicate} />}

      <form className="book-form" onSubmit={onSubmit}>
        <BookFormFields form={form} patch={patch} shelfOptions={shelfOptions} />

        <div className="modal-footer">
          <Button className="on-light" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" icon={Sparkles} iconSize={16}>
            {editing ? "Save Changes" : "Save Book"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default BookFormModal;
