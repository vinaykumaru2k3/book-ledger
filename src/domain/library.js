/**
 * Rules about a *collection* of books: statistics, filtering, sorting,
 * duplicate detection and genre extraction. Pure functions, no React.
 * (Rules about a single book live in `book.js`.)
 */
import { STATUSES, progressFor } from "./status";

/* ------------------------------ views ------------------------------ */

export const SORT_OPTIONS = [
  { value: "recent", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "progress", label: "Progress" },
  { value: "rating", label: "Rating" },
  { value: "finished", label: "Recently finished" },
];

const SHELF_PREFIX = "shelf:";
export const shelfRoute = (name) => `${SHELF_PREFIX}${name}`;
/** URL path of a shelf, e.g. "/shelf%3ASummer%20Reads". */
export const shelfPath = (name) => `/${encodeURIComponent(shelfRoute(name))}`;
export const shelfFromRoute = (route) => (route.startsWith(SHELF_PREFIX) ? route.slice(SHELF_PREFIX.length) : null);

/**
 * Does a book belong in a library view? `view` is "all", a status key,
 * "favorites" or "shelf:<name>".
 */
export function matchesView(book, view) {
  if (view === "all") return true;
  if (view === "favorites") return Boolean(book.favorite);
  const shelf = shelfFromRoute(view);
  if (shelf !== null) return (book.shelves || []).includes(shelf);
  return book.status === view;
}

/** Free-text match over the fields a reader would search by. */
export function matchesQuery(book, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [book.title, book.author, book.publishedYear, book.isbn, book.notes, ...(book.tags || [])]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function sortBooks(books, sortBy) {
  const sorted = [...books];
  const compare = {
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => a.author.localeCompare(b.author),
    progress: (a, b) => progressFor(b) - progressFor(a),
    rating: (a, b) => b.rating - a.rating,
    finished: (a, b) => (b.finishedAt || 0) - (a.finishedAt || 0),
    recent: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
  }[sortBy] || ((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  return sorted.sort(compare);
}

export function filterAndSortBooks(books, { view = "all", query = "", sortBy = "recent" } = {}) {
  return sortBooks(
    books.filter((book) => matchesView(book, view) && matchesQuery(book, query)),
    sortBy
  );
}

export function paginate(items, page, pageSize) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pageCount, start, total: items.length };
}

/* ----------------------------- statistics ----------------------------- */

/** Headline numbers for the sidebar, stats strip and progress panel. */
export function computeLibraryStats(books, year = new Date().getFullYear()) {
  const statusCounts = Object.fromEntries(Object.keys(STATUSES).map((key) => [key, 0]));
  let pagesRead = 0;
  let ratedCount = 0;
  let ratingSum = 0;
  let finishedThisYear = 0;
  let favorites = 0;

  books.forEach((book) => {
    if (book.status in statusCounts) statusCounts[book.status] += 1;
    if (book.favorite) favorites += 1;
    pagesRead += book.status === "done" && book.pages ? book.pages : book.currentPage || 0;
    if (book.rating) {
      ratedCount += 1;
      ratingSum += book.rating;
    }
    if (book.status === "done" && book.finishedAt && new Date(book.finishedAt).getFullYear() === year) {
      finishedThisYear += 1;
    }
  });

  return {
    total: books.length,
    ...statusCounts,
    pagesRead,
    finishedThisYear,
    favorites,
    averageRating: ratedCount ? (ratingSum / ratedCount).toFixed(1) : "0.0",
    completionRate: books.length ? Math.round((statusCounts.done / books.length) * 100) : 0,
  };
}

/** Books being read, furthest along first. */
export function currentlyReading(books, limit = 4) {
  return books
    .filter((book) => book.status === "reading")
    .sort((a, b) => progressFor(b) - progressFor(a))
    .slice(0, limit);
}

/** Finished books, most recently finished first. */
export function recentlyFinished(books, limit = 4) {
  return books
    .filter((book) => book.status === "done")
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, limit);
}

/* ------------------------------ duplicates ------------------------------ */

const titleAuthorKey = (title, author) => `${(title || "").trim().toLowerCase()}|${(author || "").trim().toLowerCase()}`;

/** Is a book with this title and author already in the library? */
export function isInLibrary(books, title, author) {
  const key = titleAuthorKey(title, author);
  return books.some((book) => titleAuthorKey(book.title, book.author) === key);
}

/** Finds an existing book by source id first, then by title + author. */
export function findDuplicate(books, { sourceKey, title, author }) {
  if (sourceKey) {
    const bySource = books.find((book) => book.sourceKey === sourceKey);
    if (bySource) return bySource;
  }
  const key = titleAuthorKey(title, author);
  if (key === "|") return null;
  return books.find((book) => titleAuthorKey(book.title, book.author) === key) || null;
}

/* -------------------------------- genres -------------------------------- */

// Tags that describe state rather than subject matter.
const NON_GENRE_TAGS = new Set(["want to read", "reading", "finished", "fav", "favorites", "general"]);

/** Lower-cased genre/tag names of a book, without state-like tags. */
export function genreLabels(book) {
  return [...(book.genres || []), ...(book.tags || [])]
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g && !NON_GENRE_TAGS.has(g));
}

/** Shelf names used across a set of books, sorted. */
export function shelvesOf(books) {
  const names = new Set();
  books.forEach((book) => (book.shelves || []).forEach((s) => names.add(s)));
  return Array.from(names).sort();
}
