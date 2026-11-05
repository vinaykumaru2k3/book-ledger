import React, { useEffect } from "react";

/**
 * Dialog shell: dimmed backdrop, centred panel, Escape to close.
 * Clicking the backdrop calls `onBackdropClick` (defaults to `onClose`), which
 * lets a dialog with an open dropdown close the dropdown first.
 */
function Modal({ onClose, onBackdropClick, labelledBy, className = "", children }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onBackdropClick || onClose}>
      <section
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}

export default Modal;
