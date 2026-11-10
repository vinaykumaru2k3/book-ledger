import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";

const EDGE = 8; // keep this far from the window edges
const GAP = 8; // between the button and the popover
const PHONE = "(max-width: 640px)";

/**
 * Where the popover goes: under the button that opened it (above, when there is
 * no room below), shifted sideways to stay on screen. Phones get a bottom sheet.
 */
export function placePopover(anchor, size, viewport) {
  const left = Math.min(Math.max(anchor.left, EDGE), viewport.width - size.width - EDGE);
  const below = anchor.bottom + GAP;
  const fitsBelow = below + size.height <= viewport.height - EDGE;
  const above = anchor.top - GAP - size.height;
  const top = fitsBelow || above < EDGE ? Math.min(below, Math.max(EDGE, viewport.height - size.height - EDGE)) : above;
  return { left: Math.max(EDGE, left), top };
}

/**
 * Quick "add to collections" menu opened from a book card. It is drawn at the
 * top of the page (not inside the card), so a card's transform or overflow can
 * never clip or misplace it.
 */
function ShelfPopover({ anchorRef, shelves, selected, onToggle, onCreate, onClose }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");
  const [sheet] = useState(() => Boolean(window.matchMedia?.(PHONE).matches));
  const [position, setPosition] = useState(null);
  const panel = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (sheet || !panel.current || !anchorRef?.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const { width, height } = panel.current.getBoundingClientRect();
    setPosition(placePopover(anchor, { width, height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [sheet, anchorRef]);

  useEffect(() => {
    const el = panel.current;
    (el?.querySelector("button, input") || el)?.focus();
    const onKey = (event) => event.key === "Escape" && onCloseRef.current();
    // The popover is pinned to where the button was; if the page moves, close it.
    const onMove = (event) => !el?.contains(event.target) && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    setDraft("");
  };

  const style = sheet ? undefined : position ? { top: position.top, left: position.left } : { visibility: "hidden" };

  return createPortal(
    <>
      <div className={sheet ? "pk-popover-backdrop pk-popover-backdrop--sheet" : "pk-popover-backdrop"} onClick={onClose} />
      <div ref={panel} className={sheet ? "pk-popover pk-popover--sheet" : "pk-popover"} style={style} role="dialog" aria-label={t("shelf.popoverTitle")} tabIndex={-1}>
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
    </>,
    document.body
  );
}

export default ShelfPopover;
