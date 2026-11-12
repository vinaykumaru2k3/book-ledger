import { Bookmark, BookOpen, BookCheck } from "lucide-react";

/** The three reading states a book can be in. Keys are what Firestore stores. */
export const STATUSES = {
  want: {
    label: "Want",
    longLabel: "Want to read",
    color: "var(--pk-sapphire)",
    icon: Bookmark,
  },
  reading: {
    label: "Reading",
    longLabel: "Reading",
    color: "var(--pk-gold)",
    icon: BookOpen,
  },
  done: {
    label: "Finished",
    longLabel: "Finished",
    color: "var(--pk-emerald)",
    icon: BookCheck,
  },
};

/** Reading progress as a whole percentage, 0-100. */
export function progressFor(book) {
  if (!book.pages) return book.status === "done" ? 100 : 0;
  return Math.min(Math.max(Math.round((book.currentPage / book.pages) * 100), 0), 100);
}
