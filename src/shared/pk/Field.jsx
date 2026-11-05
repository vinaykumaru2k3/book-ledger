import React, { useId } from "react";

/**
 * Labelled form control with hint and error text wired up for screen readers.
 * `as`: "input" (default) | "textarea" | "select" (pass <option>s as children).
 */
function Field({ label, hint, error, as: Control = "input", className = "", children, ...controlProps }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={["pk-field", error && "pk-field--error", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="pk-field__label">
        {label}
      </label>
      <Control
        id={id}
        className="pk-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...controlProps}
      >
        {children}
      </Control>
      {hint && !error && (
        <p id={hintId} className="pk-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="pk-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
