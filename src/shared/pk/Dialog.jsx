import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with the behaviour a keyboard or screen-reader user expects:
 * focus moves in and is trapped, Escape closes, the page behind cannot scroll,
 * and focus returns to whatever opened it. Render it only while open.
 */
function Dialog({ title, onClose, children, footer, size = "md", closeLabel = "Close" }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (panel.querySelector("[data-autofocus]") || panel.querySelector(FOCUSABLE) || panel).focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
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
  }, [onClose]);

  return createPortal(
    <div className="pk-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className={`pk-dialog pk-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="pk-dialog__header">
          <h2 id={titleId} className="pk-dialog__title">
            {title}
          </h2>
          <button type="button" className="pk-icon-btn" onClick={onClose} aria-label={closeLabel}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="pk-dialog__body">{children}</div>
        {footer && <footer className="pk-dialog__footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export default Dialog;
