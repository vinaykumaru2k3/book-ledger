import React, { useState } from "react";
import { Check, Plus } from "lucide-react";

/** Quick "add to collections" menu opened from a book card. */
function ShelfPopover({ shelves, selected, onToggle, onCreate, onClose }) {
  const [draft, setDraft] = useState("");

  const submit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    setDraft("");
  };

  return (
    <>
      <div
        className="popover-backdrop"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <div className="card-shelf-popover" onClick={(event) => event.stopPropagation()}>
        <div className="popover-title">Add to Collections</div>

        <div className="popover-checklist">
          {shelves.length === 0 ? (
            <span className="popover-empty-text">No collections created yet.</span>
          ) : (
            shelves.map((shelf) => {
              const checked = selected.includes(shelf);
              return (
                <button
                  type="button"
                  key={shelf}
                  className={`popover-check-row ${checked ? "active" : ""}`}
                  onClick={() => onToggle(shelf)}
                >
                  <span className={`popover-checkbox ${checked ? "checked" : ""}`}>{checked && <Check size={10} />}</span>
                  <span className="popover-shelf-name">{shelf}</span>
                </button>
              );
            })
          )}
        </div>

        <form className="popover-add-form" onSubmit={submit}>
          <input
            type="text"
            placeholder="New shelf..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
          <button type="submit" className="popover-add-btn" title="Create and add to shelf">
            <Plus size={12} />
          </button>
        </form>
      </div>
    </>
  );
}

export default ShelfPopover;
