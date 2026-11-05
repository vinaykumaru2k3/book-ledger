import React, { useState } from "react";

export const COVER_PALETTE = [
  ["#1e293b", "#f59e0b", "#f8fafc"], // Slate + Amber
  ["#31102f", "#ec4899", "#fdf2f8"], // Deep Purple + Pink
  ["#064e3b", "#10b981", "#ecfdf5"], // Emerald + Mint
  ["#172554", "#3b82f6", "#eff6ff"], // Navy + Blue
  ["#450a0a", "#f43f5e", "#fff1f2"], // Rose + Red
  ["#3f2001", "#d97706", "#fef3c7"], // Amber + Gold
  ["#18002a", "#8b5cf6", "#f5f3ff"], // Violet + Lavender
];

export function getCoverStyle(seed = "") {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [a, b, c] = COVER_PALETTE[total % COVER_PALETTE.length];
  return { "--cover-a": a, "--cover-b": b, "--cover-c": c };
}

export function getInitials(title = "") {
  const parts = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "BK";
  return parts.map((part) => part[0]).join("").toUpperCase();
}

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
