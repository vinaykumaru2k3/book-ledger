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

export function normalizeBook(raw) {
  const pages = Math.max(0, toNumber(raw.pages, 0));
  const currentPage = clamp(toNumber(raw.currentPage, 0), 0, pages || 999999);
  const status = STATUSES[raw.status] ? raw.status : "want";
  const done = status === "done";
  const title = String(raw.title || "Untitled").trim();
  const addedAt = raw.addedAt || Date.now();

  return {
    id: raw.id || uid(),
    title,
    author: String(raw.author || "").trim(),
    pages,
    currentPage: done && pages ? pages : currentPage,
    status,
    rating: clamp(toNumber(raw.rating, 0), 0, 5),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(raw.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    notes: String(raw.notes || ""),
    description: String(raw.description || ""),
    genres: Array.isArray(raw.genres)
      ? raw.genres.map((g) => String(g).trim()).filter(Boolean)
      : String(raw.genres || "")
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
    publishedYear: raw.publishedYear ? String(raw.publishedYear) : "",
    isbn: raw.isbn ? String(raw.isbn) : "",
    coverId: raw.coverId || null,
    coverUrl: raw.coverUrl || "",
    sourceKey: raw.sourceKey || "",
    favorite: Boolean(raw.favorite),
    shelves: Array.isArray(raw.shelves)
      ? raw.shelves.map((s) => String(s).trim()).filter(Boolean)
      : String(raw.shelves || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    addedAt,
    startedAt: raw.startedAt || (status === "reading" ? addedAt : null),
    finishedAt: done ? raw.finishedAt || Date.now() : raw.finishedAt || null,
    updatedAt: raw.updatedAt || Date.now(),
  };
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
  const pages = Math.max(0, toNumber(form.pages, 0));
  const status = STATUSES[form.status] ? form.status : "want";
  let currentPage = clamp(toNumber(form.currentPage, 0), 0, pages || 999999);

  if (status === "want") currentPage = 0;
  if (status === "done" && pages) currentPage = pages;
  if (status === "reading" && currentPage === 0 && pages) currentPage = 1;

  const now = Date.now();
  const previous = existing || {};

  return normalizeBook({
    ...previous,
    title: form.title,
    author: form.author,
    pages,
    currentPage,
    status,
    rating: form.rating,
    tags: form.tags,
    notes: form.notes,
    description: form.description,
    genres: form.genres,
    publishedYear: form.publishedYear,
    isbn: form.isbn,
    coverId: form.coverId,
    coverUrl: form.coverUrl,
    sourceKey: form.sourceKey,
    shelves: form.shelves || [],
    addedAt: previous.addedAt || now,
    startedAt:
      status === "reading" ? previous.startedAt || now : status === "want" ? null : previous.startedAt,
    finishedAt: status === "done" ? previous.finishedAt || now : null,
    updatedAt: now,
  });
}
