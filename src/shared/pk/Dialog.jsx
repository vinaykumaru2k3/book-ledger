import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with the behaviour a keyboard or screen-reader user expects:
 * focus moves in and is trapped, Escape closes, the page behind cannot scroll,
 * and focus returns to whatever opened it. Render it only while open.
 * `bare` drops the visible header and padding (the caller draws its own close
 * button); the title stays available to screen readers. `top` aligns the panel
 * to the top of the screen instead of the centre (command palette). With `bare`,
 * pass `labelledBy` (the id of your own visible heading) to name the dialog by it.
 */
function Dialog({ title, onClose, children, footer, size = "md", closeLabel = "Close", bare = false, top = false, className = "", labelledBy }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // Always call the latest onClose without re-running the focus/scroll setup below
  // (an inline handler changes identity on every render of the parent).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (panel.querySelector("[data-autofocus]") || panel.querySelector(FOCUSABLE) || panel).focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return createPortal(
    <div className={top ? "pk-dialog-backdrop pk-dialog-backdrop--top" : "pk-dialog-backdrop"} onMouseDown={(event) => event.target === event.currentTarget && onCloseRef.current()}>
      <div
        ref={panelRef}
        className={`pk-dialog pk-dialog--${size}${bare ? " pk-dialog--bare" : ""}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        tabIndex={-1}
      >
        {bare ? (
          // A caller that has its own visible heading passes `labelledBy` and skips the hidden one.
          !labelledBy && (
            <h2 id={titleId} className="pk-visually-hidden">
              {title}
            </h2>
          )
        ) : (
          <header className="pk-dialog__header">
            <h2 id={titleId} className="pk-dialog__title">
              {title}
            </h2>
            <button type="button" className="pk-icon-btn" onClick={onClose} aria-label={closeLabel}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
        )}
        <div className={bare ? "pk-dialog__body pk-dialog__body--bare" : "pk-dialog__body"}>{children}</div>
        {footer && <footer className="pk-dialog__footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export default Dialog;
