import React, { useState } from "react";
import { getCoverStyle, getInitials } from "../lib/cover";

/**
 * A book cover with physical depth: spine highlight, page edge and shadow.
 * Falls back to a coloured jacket with initials when there is no image (or it
 * fails to load). size: "sm" | "md" | "lg", or "fluid" to fill its container (2:3).
 */
function BookCover({ book, size = "md", className = "" }) {
  const [failed, setFailed] = useState(false);
  const title = book?.title || "";
  const showImage = book?.coverUrl && !failed;

  return (
    <div
      className={["pk-cover", `pk-cover--${size}`, className].filter(Boolean).join(" ")}
      style={getCoverStyle(`${title}${book?.author || ""}`)}
      data-cover-id={book?.id}
    >
      {showImage ? (
        <img src={book.coverUrl} alt={title ? `Cover of ${title}` : "Book cover"} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="pk-cover__jacket" aria-hidden="true">
          <span className="pk-cover__initials">{getInitials(title)}</span>
        </div>
      )}
      <span className="pk-cover__spine" aria-hidden="true" />
    </div>
  );
}

export default BookCover;
