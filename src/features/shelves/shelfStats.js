/** Pure numbers about a shelf, for its nameplate and its page. */
import { scriptMix } from "../library/dashboard/insights";
import { progressFor } from "../../domain/status";

export function shelfStats(books) {
  const total = books.length;
  const finished = books.filter((book) => book.status === "done").length;
  const reading = books.filter((book) => book.status === "reading").length;
  const pages = books.reduce((sum, book) => sum + (book.pages || 0), 0);
  // How much of the shelf has been read, weighting each book equally.
  const readShare = total ? Math.round(books.reduce((sum, book) => sum + progressFor(book), 0) / total) : 0;
  return { total, finished, reading, pages, readShare, scripts: scriptMix(books).length };
}

/** Books that are on no shelf at all. */
export function unshelvedBooks(books) {
  return books.filter((book) => !(book.shelves || []).length);
}
