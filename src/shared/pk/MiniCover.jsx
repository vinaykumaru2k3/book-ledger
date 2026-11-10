import React from "react";
import { getCoverStyle } from "../lib/cover";

const ART = ["arc", "band", "sun", "grid"];
const KANNADA = /[ಀ-೿]/;

/**
 * A small generated book cover (title, author and a geometric motif in the
 * book's colours). Decorative: callers hide it from assistive tech.
 */
function MiniCover({ title, author = "", variant = 0 }) {
  const lang = KANNADA.test(title) ? "kn" : "en";
  return (
    <div className={`pk-mcover pk-mcover--${ART[variant % ART.length]}`} style={getCoverStyle(title + author)}>
      <span className="pk-mcover__art" />
      <span className="pk-mcover__title" lang={lang}>
        {title}
      </span>
      <span className="pk-mcover__author" lang={lang}>
        {author}
      </span>
    </div>
  );
}

export default MiniCover;
