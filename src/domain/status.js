import { Bookmark, BookOpen, BookCheck } from "lucide-react";

/** The three reading states a book can be in. Keys are what Firestore stores. */
export const STATUSES = {
  want: {
    label: "Want",
    longLabel: "Want to read",
    color: "#d97706",
    icon: Bookmark,
  },
  reading: {
    label: "Reading",
    longLabel: "Reading",
    color: "#b91c1c",
    icon: BookOpen,
  },
  done: {
    label: "Finished",
    longLabel: "Finished",
    color: "#1d4ed8",
    icon: BookCheck,
  },
};

/** Reading progress as a whole percentage, 0-100. */
export function progressFor(book) {
  if (!book.pages) return book.status === "done" ? 100 : 0;
  return Math.min(Math.max(Math.round((book.currentPage / book.pages) * 100), 0), 100);
}
