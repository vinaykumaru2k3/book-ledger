import { Bookmark, BookOpen, BookCheck } from "lucide-react";

export const STATUSES = {
  want: {
    label: "Want",
    longLabel: "Want to read",
    color: "#b45f43",
    icon: Bookmark,
  },
  reading: {
    label: "Reading",
    longLabel: "Reading",
    color: "#2d7d73",
    icon: BookOpen,
  },
  done: {
    label: "Finished",
    longLabel: "Finished",
    color: "#7356a6",
    icon: BookCheck,
  },
};

export const SORTS = [
  { value: "recent", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "progress", label: "Progress" },
  { value: "rating", label: "Rating" },
  { value: "finished", label: "Recently finished" },
];

export function progressFor(book) {
  if (!book.pages) return book.status === "done" ? 100 : 0;
  return Math.min(Math.max(Math.round((book.currentPage / book.pages) * 100), 0), 100);
}

export function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
