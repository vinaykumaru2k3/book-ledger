/**
 * Book domain model.
 *
 * Everything that decides what a "valid" book looks like lives here, so the
 * Firestore controller, import/export and the forms all share one set of rules.
 * Nothing in this file touches React or Firebase, which keeps it unit-testable.
 */
import { STATUSES } from "./status";

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Accepts an array or a comma separated string; returns trimmed, non-empty strings. */
function toStringList(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return list.map((item) => String(item).trim()).filter(Boolean);
}

/**
 * Keeps page progress and status consistent with each other.
 *
 * Without `previous` (loading stored data, importing, adding a new book) the
 * rules infer the status from progress:
 *  - reaching the last page marks a book "done"
 *  - turning a "want" book's page counter above 0 marks it "reading"
 *
 * With `previous` (the stored copy, when the user is *editing*) we can tell
 * what the user changed, and an explicit choice always wins over inference:
 *  - picking a status ("Want to read", "Reading", "Finished") sticks. Progress
 *    is adjusted to fit it, never the other way round, so a finished book can
 *    be set back to "Reading" (restarting at the beginning) and a book you are
 *    reading can be set back to "Want to read".
 *  - lowering the page of a *finished* book means you are reading it again.
 *
 * In every case "want" resets progress and "done" fills it.
 *
 * `stampAt` controls timestamps. Pass `Date.now()` when the user is *writing*
 * a change so that a status transition records startedAt / finishedAt. Leave
 * it undefined when merely *reading* stored data, so loading a book never
 * invents dates (which used to rewrite "finished" dates on every load).
 */
export function reconcileBookStatus(book, stampAt, previous) {
  const pages = Math.max(0, toNumber(book.pages, 0));
  let currentPage = clamp(toNumber(book.currentPage, 0), 0, pages || 999999);
  let status = STATUSES[book.status] ? book.status : "want";
  const statusChanged = Boolean(previous) && previous.status !== status;

  if (statusChanged) {
    // Explicit choice: keep it. Re-reading a finished book starts again from the top.
    if (status === "reading" && previous.status === "done" && pages > 0 && currentPage >= pages) currentPage = 0;
  } else if (previous?.status === "done" && status === "done" && pages > 0 && currentPage < pages && currentPage < toNumber(previous.currentPage, 0)) {
    status = "reading"; // the page of a finished book was lowered
  } else if (pages > 0 && currentPage >= pages && status !== "done") {
    status = "done";
  } else if (currentPage > 0 && currentPage < pages && status === "want") {
    status = "reading";
  }

  if (status === "want") {
    currentPage = 0;
  } else if (status === "done" && pages > 0) {
    currentPage = pages;
  } else if (status === "reading" && currentPage === 0 && pages > 0) {
    currentPage = 1;
  }

  let startedAt = book.startedAt ?? null;
  let finishedAt = book.finishedAt ?? null;
  if (status === "want") {
    startedAt = null;
    finishedAt = null;
  } else if (status === "reading") {
    finishedAt = null;
    if (!startedAt && stampAt) startedAt = stampAt;
  } else if (status === "done" && !finishedAt && stampAt) {
    finishedAt = stampAt;
  }

  return { ...book, pages, currentPage, status, startedAt, finishedAt };
}

/**
 * Turns anything (a form, a Firestore doc, an imported JSON entry) into a
 * complete book. Pass `{ stamp: true }` when the user is saving a change, and
 * `previous` (the stored copy) when editing, so explicit status choices are honoured.
 */
export function normalizeBook(raw, { stamp = false, previous } = {}) {
  const now = Date.now();
  const book = {
    id: raw.id || uid(),
    title: String(raw.title || "Untitled").trim(),
    author: String(raw.author || "").trim(),
    pages: raw.pages,
    currentPage: raw.currentPage,
    status: raw.status,
    rating: clamp(toNumber(raw.rating, 0), 0, 5),
    tags: toStringList(raw.tags),
    notes: String(raw.notes || ""),
    description: String(raw.description || ""),
    genres: toStringList(raw.genres),
    publishedYear: raw.publishedYear ? String(raw.publishedYear) : "",
    isbn: raw.isbn ? String(raw.isbn) : "",
    coverId: raw.coverId || null,
    coverUrl: raw.coverUrl || "",
    // Where the cover came from ("wikipedia", "openlibrary", "google", "manual"),
    // or "removed" when the user cleared it, so automatic lookups leave it alone.
    coverSource: raw.coverSource ? String(raw.coverSource) : "",
    coverCheckedAt: raw.coverCheckedAt || null,
    sourceKey: raw.sourceKey || "",
    favorite: Boolean(raw.favorite),
    shelves: toStringList(raw.shelves),
    addedAt: raw.addedAt || now,
    startedAt: raw.startedAt ?? null,
    finishedAt: raw.finishedAt ?? null,
    updatedAt: stamp ? now : raw.updatedAt || now,
  };

  return reconcileBookStatus(book, stamp ? now : undefined, previous);
}

/**
 * The fields whose values differ between two versions of a book. Saving only
 * these (instead of the whole book) keeps two quick edits to *different*
 * fields from overwriting each other with stale copies.
 */
export function changedFields(before, after) {
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => !same(before[key], value)));
}

/* ------------------------- import / dedupe ------------------------- */

/** Identity of a book independent of its id, used to avoid duplicate imports. */
export function contentKey(book) {
  if (book.sourceKey) return `src:${book.sourceKey}`;
  if (book.isbn) return `isbn:${book.isbn}`;
  return `ta:${(book.title || "").toLowerCase()}|${(book.author || "").toLowerCase()}`;
}

function hashString(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Parses the text of a backup file into normalized books.
 * Entries without an id get a deterministic one, so importing the same file
 * twice is idempotent instead of creating duplicates.
 */
export function parseLedger(text) {
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed?.books;
  if (!Array.isArray(incoming)) throw new Error("Invalid backup format");

  return incoming
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => {
      const book = normalizeBook(entry);
      return entry.id ? book : { ...book, id: `imp-${hashString(contentKey(book))}` };
    });
}

/** Returns the incoming books that are not already present (by id or content). */
export function findNewBooks(existing, incoming) {
  const seenIds = new Set(existing.map((book) => book.id));
  const seenKeys = new Set(existing.map(contentKey));
  const additions = [];
  incoming.forEach((book) => {
    const key = contentKey(book);
    if (seenIds.has(book.id) || seenKeys.has(key)) return;
    seenIds.add(book.id);
    seenKeys.add(key);
    additions.push(book);
  });
  return additions;
}

/* ------------------------------ forms ------------------------------ */

export function formFromBook(book) {
  return {
    title: book.title,
    author: book.author,
    pages: book.pages ? String(book.pages) : "",
    currentPage: book.currentPage ? String(book.currentPage) : "",
    status: book.status,
    rating: book.rating || 0,
    tags: book.tags.join(", "),
    notes: book.notes,
    description: book.description || "",
    genres: (book.genres || []).join(", "),
    publishedYear: book.publishedYear,
    isbn: book.isbn,
    coverId: book.coverId,
    coverUrl: book.coverUrl,
    coverSource: book.coverSource || "",
    sourceKey: book.sourceKey,
    shelves: book.shelves || [],
  };
}

/** Builds a book to save from the edit form, preserving fields the form lacks. */
export function createBookFromForm(form, existing = null) {
  const merged = { ...(existing || {}), ...form };
  // Clearing a cover is a choice: mark it so automatic lookups do not bring it back.
  if (existing?.coverUrl && !String(merged.coverUrl || "").trim()) merged.coverSource = "removed";
  return normalizeBook(merged, { stamp: true, previous: existing || undefined });
}

/**
 * Merges a catalogue lookup into the form being edited. Whatever the user has
 * already typed (status, progress, rating, notes, shelves, title, author) wins;
 * the lookup supplies the rest.
 */
export function mergeLookupIntoForm(current, lookup) {
  return {
    ...lookup,
    status: current.status || lookup.status,
    currentPage: current.currentPage || lookup.currentPage,
    rating: current.rating || lookup.rating,
    notes: current.notes || lookup.notes,
    shelves: current.shelves?.length ? current.shelves : lookup.shelves || [],
    title: current.title?.trim() ? current.title : lookup.title,
    author: current.author?.trim() ? current.author : lookup.author,
  };
}
