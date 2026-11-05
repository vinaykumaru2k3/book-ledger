import React from "react";
import { AlertTriangle } from "lucide-react";
import { STATUSES } from "../../../domain/status";

/** Shown when the book being added looks like one already in the library. */
function DuplicateWarning({ book }) {
  const status = STATUSES[book.status]?.longLabel || book.status;
  return (
    <div className="duplicate-warning">
      <AlertTriangle size={16} />
      <span>
        <strong>{book.title}</strong>
        {book.author ? ` by ${book.author}` : ""} is already in your library{status ? ` (${status})` : ""}. You can
        still save if this is a different edition.
      </span>
    </div>
  );
}

export default DuplicateWarning;
