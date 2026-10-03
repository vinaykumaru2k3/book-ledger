import { STATUSES } from "../components/constants";

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

// Add debug logger toggle (can be enabled via localStorage)
const DEBUG_MODE = typeof window !== 'undefined' && localStorage.getItem('book-ledger:debug') === 'true';

function logTransition(book, reason, oldStatus, newStatus) {
  if (DEBUG_MODE || process.env.NODE_ENV === 'development') {
    console.debug(`[BookSync] "${book.title}": ${reason} (${oldStatus} -> ${newStatus})`);
  }
}

export function reconcileBookStatus(book) {
  const pages = Math.max(0, toNumber(book.pages, 0));
  let currentPage = clamp(toNumber(book.currentPage, 0), 0, pages || 999999);
  let status = STATUSES[book.status] ? book.status : "want";
  const now = Date.now();

  const originalStatus = status;
  const explicitStatusChange = book._statusExplicitlySet;

  // 1. Auto-promote status based on page progress (only if status wasn't explicitly chosen)
  if (!explicitStatusChange) {
    if (pages > 0 && currentPage >= pages && status !== "done") {
      status = "done";
      logTransition(book, "Reached final page", originalStatus, status);
    } else if (currentPage > 0 && currentPage < pages && status === "want") {
      status = "reading";
      logTransition(book, "Started reading", originalStatus, status);
    }
  }

  // 2. Enforce constraints based on status
  if (status === "want") {
    currentPage = 0;
  } else if (status === "done" && pages > 0) {
    currentPage = pages;
  } else if (status === "reading" && currentPage === 0 && pages > 0) {
    currentPage = 1;
  }

  const result = {
    ...book,
    pages,
    currentPage,
    status,
    startedAt: status === "reading" && !book.startedAt ? now : (status === "want" ? null : book.startedAt),
    finishedAt: status === "done" && !book.finishedAt ? now : (status === "done" ? book.finishedAt : null)
  };
  delete result._statusExplicitlySet;
  return result;
}

export function normalizeBook(raw) {
  const book = {
    id: raw.id || uid(),
    title: String(raw.title || "Untitled").trim(),
    author: String(raw.author || "").trim(),
    pages: raw.pages,
    currentPage: raw.currentPage,
    status: raw.status,
    rating: clamp(toNumber(raw.rating, 0), 0, 5),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(raw.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    notes: String(raw.notes || ""),
    description: String(raw.description || ""),
    genres: Array.isArray(raw.genres)
      ? raw.genres.map((g) => String(g).trim()).filter(Boolean)
      : String(raw.genres || "").split(",").map((g) => g.trim()).filter(Boolean),
    publishedYear: raw.publishedYear ? String(raw.publishedYear) : "",
    isbn: raw.isbn ? String(raw.isbn) : "",
    coverId: raw.coverId || null,
    coverUrl: raw.coverUrl || "",
    sourceKey: raw.sourceKey || "",
    favorite: Boolean(raw.favorite),
    shelves: Array.isArray(raw.shelves)
      ? raw.shelves.map((s) => String(s).trim()).filter(Boolean)
      : String(raw.shelves || "").split(",").map((s) => s.trim()).filter(Boolean),
    addedAt: raw.addedAt || Date.now(),
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    updatedAt: raw.updatedAt || Date.now(),
    _statusExplicitlySet: raw._statusExplicitlySet,
  };

  return reconcileBookStatus(book);
}

export function loadBooks() {
  try {
    const stored = localStorage.getItem("personal-book-ledger:v1");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const incoming = Array.isArray(parsed) ? parsed : parsed.books;
    return Array.isArray(incoming) ? incoming.map(normalizeBook) : [];
  } catch {
    return [];
  }
}

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
    sourceKey: book.sourceKey,
    shelves: book.shelves || [],
  };
}

export function createBookFromForm(form, existing = null) {
  const previous = existing || {};
  const explicitStatusChange = form.status !== undefined && (!existing || form.status !== previous.status);
  
  return normalizeBook({
    ...previous,
    ...form,
    updatedAt: Date.now(),
    _statusExplicitlySet: explicitStatusChange,
  });
}
