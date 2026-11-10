import React, { useState } from "react";

import { getCoverStyle, getInitials } from "../lib/cover";

export { getCoverStyle, getInitials };

function Cover({ book, className = "" }) {
  const title = book?.title || "";
  const author = book?.author || "";
  const coverUrl = book?.coverUrl || "";
  const seed = `${title}${author}`;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = coverUrl && !imgFailed;

  return (
    <div
      className={`cover ${className}`}
      style={getCoverStyle(seed)}
    >
      {showImage ? (
        <img
          src={coverUrl}
          alt={title || "Book Cover"}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="cover-fallback" aria-hidden="true">
          <span className="cover-initials">{getInitials(title)}</span>
          <div className="cover-spine-accent" />
        </div>
      )}
    </div>
  );
}

export default Cover;
