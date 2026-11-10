import React from "react";
import { getCoverStyle } from "../lib/cover";
import { langOf } from "../lib/script";

const ART = ["arc", "band", "sun", "grid"];

/**
 * A small generated book cover (title, author and a geometric motif in the
 * book's colours). Works for titles in any script. Decorative: callers hide it
 * from assistive tech.
 */
function MiniCover({ title, author = "", variant = 0 }) {
  return (
    <div className={`pk-mcover pk-mcover--${ART[variant % ART.length]}`} style={getCoverStyle(title + author)}>
      <span className="pk-mcover__art" />
      <span className="pk-mcover__title" lang={langOf(title)}>
        {title}
      </span>
      <span className="pk-mcover__author" lang={langOf(author)}>
        {author}
      </span>
    </div>
  );
}

export default MiniCover;
