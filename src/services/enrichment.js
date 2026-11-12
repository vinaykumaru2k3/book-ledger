/**
 * Metadata enrichment.
 *
 * Books added by hand (or imported) often lack tags and a page count. This
 * module looks them up on Google Books, then Open Library, and caches the
 * answers for the browser tab so the same book is never fetched twice.
 *
 * It is deliberately free of React and Firestore: `lookupDetails` returns data
 * and `buildUpdates` says which fields would fill gaps. The controller decides
 * when to run it and how to save the result.
 */

import { withGoogleKey } from "./bookApi";

const CACHE_STORAGE_KEY = "pusthaka-enrich-cache";
const detailsCache = new Map(); // key -> { tags, pages }
const inflight = new Map(); // key -> Promise, dedupes concurrent lookups
let cacheLoaded = false;

function loadCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) Object.entries(JSON.parse(raw)).forEach(([k, v]) => detailsCache.set(k, v));
  } catch {
    /* storage unavailable or corrupt: start empty */
  }
}

function persistCache() {
  try {
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(detailsCache)));
  } catch {
    /* storage unavailable or full */
  }
}

export function enrichKey(book) {
  return book.sourceKey || book.isbn || `${book.title || ""}|${book.author || ""}`.toLowerCase();
}

export function cleanTags(categories) {
  const flat = (categories || [])
    .map((cat) => (typeof cat === "string" ? cat.split("/").map((s) => s.trim()) : []))
    .flat()
    .filter((cat) => cat.length > 1 && cat.length < 25);
  const unique = [...new Set(flat)].slice(0, 3);
  return unique.length > 0 ? unique : ["General"];
}

/** Which of the looked-up fields would fill a gap on this book? */
export function buildUpdates(book, data) {
  const updates = {};
  if ((!book.tags || book.tags.length === 0) && data?.tags?.length) updates.tags = data.tags;
  if (!book.pages && data?.pages) updates.pages = data.pages;
  return updates;
}

export function needsEnrichment(book) {
  const missingTags = !book.tags || book.tags.length === 0;
  return (missingTags || !book.pages) && Boolean(book.sourceKey || book.isbn || book.title);
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
}

async function fetchEnrichData(book) {
  let categories = [];
  let pages = 0;

  try {
    if (book.sourceKey && !book.sourceKey.startsWith("/works/") && !book.sourceKey.startsWith("wd:")) {
      const data = await fetchJson(
        withGoogleKey(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(book.sourceKey)}`)
      );
      categories = data?.volumeInfo?.categories || [];
      pages = data?.volumeInfo?.pageCount || 0;
    }

    if (!categories.length || !pages) {
      const q = book.isbn ? `isbn:${book.isbn}` : `${book.title}${book.author ? ` ${book.author}` : ""}`;
      const data = await fetchJson(
        withGoogleKey(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`)
      );
      const info = data?.items?.[0]?.volumeInfo;
      if (info) {
        if (!categories.length) categories = info.categories || [];
        if (!pages) pages = info.pageCount || 0;
      }
    }

    if (!categories.length || !pages) {
      const fields = "&fields=key,title,author_name,number_of_pages_median,subject,isbn";
      const params = book.isbn
        ? `isbn=${encodeURIComponent(book.isbn)}`
        : `q=${encodeURIComponent(book.title + (book.author ? ` ${book.author}` : ""))}`;
      const data = await fetchJson(`https://openlibrary.org/search.json?limit=1&${params}${fields}`);
      const found = data?.docs?.[0];
      if (found) {
        if (!categories.length) categories = found.subject ? found.subject.slice(0, 3) : [];
        if (!pages) pages = found.number_of_pages_median || found.number_of_pages || 0;
      }
    }
  } catch (err) {
    console.error(`[Enrich] lookup failed for "${book.title}":`, err);
    return null;
  }

  return { tags: cleanTags(categories), pages };
}

/** Cached, de-duplicated lookup. Resolves to `{ tags, pages }` or null on failure. */
export async function lookupDetails(book) {
  loadCache();
  const key = enrichKey(book);

  if (detailsCache.has(key)) return detailsCache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const promise = fetchEnrichData(book)
    .then((data) => {
      if (data) {
        detailsCache.set(key, data);
        persistCache();
      }
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
