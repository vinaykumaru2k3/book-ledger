/**
 * Generated cover artwork helpers: a stable colour scheme and initials for a book
 * from its title and author, used when a book has no cover image.
 */
// Bookbinding leathers and cloths, each with its foil and lettering:
// [binding, foil, lettering]. Same jewel set as the app's palette.
export const COVER_PALETTE = [
  ["#5e1029", "#d9b46a", "#f6ead4"], // Garnet morocco, gilt
  ["#16255a", "#c9a052", "#eef0f7"], // Sapphire cloth, gilt
  ["#0f3d31", "#d6b46e", "#f2ecd9"], // Emerald, gilt
  ["#381a49", "#e2c27d", "#f3e9f0"], // Amethyst, gilt
  ["#0c3a43", "#8cc7bb", "#e9f4f1"], // Peacock, verdigris
  ["#3a2214", "#e0b46a", "#f6ead4"], // Tobacco calf, gilt
  ["#1b1d36", "#c98f6c", "#f2e6dc"], // Midnight ink, copper
  ["#6a2238", "#f0c9a8", "#fbeee6"], // Rose madder, blush foil
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
