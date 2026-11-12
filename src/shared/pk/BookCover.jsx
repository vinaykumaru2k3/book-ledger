import React, { useState } from "react";
import { getCoverStyle, getInitials } from "../lib/cover";

/**
 * A book cover with physical depth: spine highlight, page edge and shadow.
 * Falls back to a coloured jacket with initials when there is no image (or it
 * fails to load). size: "sm" | "md" | "lg", or "fluid" to fill its container (2:3).
 */
function BookCover({ book, size = "md", className = "" }) {
  // Remember which URL failed, so a new cover gets its own chance to load.
  const [failedUrl, setFailedUrl] = useState("");
  const title = book?.title || "";
  const showImage = book?.coverUrl && failedUrl !== book.coverUrl;

  return (
    <div
      className={["pk-cover", `pk-cover--${size}`, className].filter(Boolean).join(" ")}
      style={getCoverStyle(`${title}${book?.author || ""}`)}
      data-cover-id={book?.id}
    >
      {showImage ? (
        <img src={book.coverUrl} alt={title ? `Cover of ${title}` : "Book cover"} loading="lazy" onError={() => setFailedUrl(book.coverUrl)} />
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
