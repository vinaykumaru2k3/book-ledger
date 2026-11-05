import React, { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/** Quick "add to collections" menu opened from a book card. */
function ShelfPopover({ shelves, selected, onToggle, onCreate, onClose }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    setDraft("");
  };

  return (
    <>
      <div className="pk-popover-backdrop" onClick={onClose} />
      <div
        className="pk-popover"
        role="dialog"
        aria-label={t("shelf.popoverTitle")}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <p className="pk-popover__title">{t("shelf.popoverTitle")}</p>

        <div className="pk-popover__list">
          {shelves.length === 0 ? (
            <p className="pk-popover__empty">{t("shelf.none")}</p>
          ) : (
            shelves.map((shelf) => {
              const checked = selected.includes(shelf);
              return (
                <button
                  type="button"
                  key={shelf}
                  role="checkbox"
                  aria-checked={checked}
                  className={checked ? "pk-popover__row pk-popover__row--on" : "pk-popover__row"}
                  onClick={() => onToggle(shelf)}
                >
                  <span className="pk-popover__box" aria-hidden="true">
                    {checked && <Check size={12} />}
                  </span>
                  <span>{shelf}</span>
                </button>
              );
            })
          )}
        </div>

        <form className="pk-popover__form" onSubmit={submit}>
          <input type="text" placeholder={t("shelf.newPlaceholder")} aria-label={t("shelf.newPlaceholder")} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" className="pk-icon-btn pk-popover__add" title={t("shelf.create")} aria-label={t("shelf.create")}>
            <Plus size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  );
}

export default ShelfPopover;
