import React, { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../../../shared/pk/Button";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

/**
 * Toggle chips for existing shelves plus an input to create a new one.
 * `available` is every shelf name to offer; `selected` the ones on this book.
 */
function ShelfPicker({ available, selected, onChange }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");

  const toggle = (shelf) =>
    onChange(selected.includes(shelf) ? selected.filter((s) => s !== shelf) : [...selected, shelf]);

  const addDraft = () => {
    const name = draft.trim();
    if (!name) return;
    if (!selected.includes(name)) onChange([...selected, name]);
    setDraft("");
  };

  return (
    <fieldset className="pk-shelfpicker">
      <legend>{t("form.shelves")}</legend>

      {available.length > 0 && (
        <div className="pk-chips">
          {available.map((shelf) => (
            <button
              type="button"
              key={shelf}
              className={selected.includes(shelf) ? "pk-chip pk-chip--on" : "pk-chip"}
              aria-pressed={selected.includes(shelf)}
              onClick={() => toggle(shelf)}
            >
              {shelf}
            </button>
          ))}
        </div>
      )}

      <div className="pk-shelfpicker__add">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder={t("form.newShelf")}
          aria-label={t("form.newShelf")}
        />
        <Button icon={Plus} onClick={addDraft}>
          {t("form.addShelf")}
        </Button>
      </div>
    </fieldset>
  );
}

export default ShelfPicker;
