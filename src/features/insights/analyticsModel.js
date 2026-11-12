/** Numbers behind the Insights page. Pure functions, no React. */
import { genreLabels } from "../../domain/library";
import { scriptMix } from "../../shared/lib/readingStats";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const ALL_TIME = "all";

const DAY_MS = 24 * 60 * 60 * 1000;

const titleCase = (text) =>
  text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const finishedDate = (book) => {
  if (!book.finishedAt) return null;
  const date = new Date(book.finishedAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Days between starting and finishing a book, or null when either date is missing. */
export function daysToRead(book) {
  const finished = finishedDate(book);
  const started = book.startedAt ? new Date(book.startedAt) : null;
  if (!finished || !started || Number.isNaN(started.getTime())) return null;
  return Math.max(Math.round((finished - started) / DAY_MS), 1);
}

/** Years that have finished books, newest first. The current year is always offered. */
export function reportYears(books, now = new Date()) {
  const years = new Set([now.getFullYear()]);
  books.forEach((book) => {
    const finished = book.status === "done" ? finishedDate(book) : null;
    if (finished) years.add(finished.getFullYear());
  });
  return [...years].sort((a, b) => b - a);
}

/** The finished books a report covers: one year, or everything ever finished. */
export function finishedInScope(books, scope) {
  return books
    .filter((book) => {
      if (book.status !== "done") return false;
      if (scope === ALL_TIME) return true;
      return finishedDate(book)?.getFullYear() === scope;
    })
    .sort((a, b) => (finishedDate(a)?.getTime() ?? 0) - (finishedDate(b)?.getTime() ?? 0));
}

function countBy(items, keyOf) {
  const counts = new Map();
  items.forEach((item) => {
    keyOf(item).forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const pick = (books, better) => books.reduce((best, book) => (!best || better(book, best) ? book : best), null);

/** A short, honest label for the kind of reader the numbers describe. */
export function readerProfile({ finished, genres, scripts, averagePages, averageRating }) {
  if (finished.length === 0) return { id: "newcomer", detail: 0 };
  const scriptCount = scripts.length;
  if (scriptCount >= 3) return { id: "polyglot", detail: scriptCount };
  if (finished.length >= 3 && genres.length && genres[0][1] / finished.length >= 0.6) {
    return { id: "devotee", detail: genres[0][0] };
  }
  if (averagePages >= 450) return { id: "marathoner", detail: averagePages };
  if (finished.length >= 3 && averagePages > 0 && averagePages <= 220) return { id: "sprinter", detail: averagePages };
  if (finished.length >= 3 && Number(averageRating) >= 4.3) return { id: "connoisseur", detail: averageRating };
  return { id: "explorer", detail: genres.length };
}

/**
 * Everything the Insights page shows for one report scope (a year, or ALL_TIME).
 * Library-wide counts ignore the scope; reading numbers only count finished books.
 */
export function computeInsights(books, scope = new Date().getFullYear()) {
  const finished = finishedInScope(books, scope);

  const pages = finished.reduce((sum, book) => sum + (book.pages || 0), 0);
  const monthlyBooks = Array(12).fill(0);
  const monthlyPages = Array(12).fill(0);
  finished.forEach((book) => {
    const date = finishedDate(book);
    if (!date) return;
    monthlyBooks[date.getMonth()] += 1;
    monthlyPages[date.getMonth()] += book.pages || 0;
  });

  const rated = finished.filter((book) => book.rating > 0);
  const averageRating = rated.length ? (rated.reduce((sum, book) => sum + book.rating, 0) / rated.length).toFixed(1) : "0.0";
  const ratingHistogram = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: rated.filter((book) => Math.round(book.rating) === stars).length }));

  const genres = countBy(finished, (book) => genreLabels(book).map(titleCase));
  const authors = countBy(
    finished.filter((book) => book.author),
    (book) => [book.author]
  );
  const scripts = scriptMix(finished);

  const withPages = finished.filter((book) => book.pages > 0);
  const averagePages = withPages.length ? Math.round(pages / withPages.length) : 0;
  const timed = finished.map((book) => ({ book, days: daysToRead(book) })).filter((entry) => entry.days !== null);
  const fastest = pick(timed, (a, b) => a.days < b.days);
  const slowest = pick(timed, (a, b) => a.days > b.days);
  const busiestMonth = monthlyBooks.some(Boolean) ? monthlyBooks.indexOf(Math.max(...monthlyBooks)) : -1;

  return {
    scope,
    finished,
    finishedCount: finished.length,
    pages,
    averagePages,
    averageRating,
    ratedCount: rated.length,
    ratingHistogram,
    monthlyBooks,
    monthlyPages,
    busiestMonth,
    genres,
    authors: authors.slice(0, 5),
    scripts,
    records: {
      longest: pick(withPages, (a, b) => a.pages > b.pages),
      shortest: pick(withPages, (a, b) => a.pages < b.pages),
      topRated: pick(rated, (a, b) => a.rating > b.rating),
      fastest: fastest ? { ...fastest } : null,
      slowest: slowest ? { ...slowest } : null,
    },
    profile: readerProfile({ finished, genres, scripts, averagePages, averageRating }),
    library: {
      total: books.length,
      reading: books.filter((book) => book.status === "reading").length,
      want: books.filter((book) => book.status === "want").length,
      favorites: books.filter((book) => book.favorite).length,
    },
  };
}

/** Percentage (0-100) of the yearly goal reached. */
export function goalProgress(completed, goal) {
  return goal > 0 ? Math.min((completed / goal) * 100, 100) : 0;
}
