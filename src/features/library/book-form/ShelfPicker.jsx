import React, { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../../../shared/ui/Button";

/**
 * Toggle chips for existing shelves plus an input to create a new one.
 * `available` is every shelf name to offer; `selected` the ones on this book.
 */
function ShelfPicker({ available, selected, onChange }) {
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
    <div className="field span-2 shelves-input-container">
      <span>Custom Shelves / Collections</span>

      {available.length > 0 && (
        <div className="shelves-checklist">
          {available.map((shelf) => (
            <button
              type="button"
              key={shelf}
              className={`shelf-pill-label ${selected.includes(shelf) ? "active" : ""}`}
              onClick={() => toggle(shelf)}
            >
              <span>{shelf}</span>
            </button>
          ))}
        </div>
      )}

      <div className="add-shelf-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="Create new shelf (e.g. Summer Reads)"
        />
        <Button compact icon={Plus} iconSize={14} onClick={addDraft}>
          Add Shelf
        </Button>
      </div>
    </div>
  );
}

export default ShelfPicker;
