import { useEffect, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { uid, clamp, toNumber, normalizeBook, loadBooks, createBookFromForm } from "../utils/book";

/* ------------------------------------------------------------------ *
 * Module-level enrichment caches (survive renders / persist per tab) *
 * ------------------------------------------------------------------ */
const detailsCache = new Map(); // key -> { tags, pages }
const inflight = new Map(); // key -> Promise (dedupe concurrent fetches)
let cacheLoaded = false;

function loadCacheFromStorage() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = sessionStorage.getItem("pusthaka-enrich-cache");
    if (raw) {
      const obj = JSON.parse(raw);
      Object.entries(obj).forEach(([k, v]) => detailsCache.set(k, v));
    }
  } catch {
    /* ignore */
  }
}

function persistCache() {
  try {
    const obj = Object.fromEntries(detailsCache.entries());
    sessionStorage.setItem("pusthaka-enrich-cache", JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function enrichKey(book) {
  return book.sourceKey || book.isbn || `${book.title || ""}|${book.author || ""}`.toLowerCase();
}

function cleanTags(categories) {
  const flat = (categories || [])
    .map((cat) => (typeof cat === "string" ? cat.split("/").map((s) => s.trim()) : []))
    .flat()
    .map((cat) => cat.trim())
    .filter((cat) => cat.length > 1 && cat.length < 25);
  const unique = [...new Set(flat)].slice(0, 3);
  return unique.length > 0 ? unique : ["General"];
}

function buildUpdates(book, data) {
  const updates = {};
  if ((!book.tags || book.tags.length === 0) && data.tags && data.tags.length) {
    updates.tags = data.tags;
  }
  if (!book.pages && data.pages) {
    updates.pages = data.pages;
  }
  return updates;
}

// Does the cache already hold the data this book is missing?
function cacheCovers(book) {
  const cached = detailsCache.get(enrichKey(book));
  if (!cached) return false;
  const missingTags = !book.tags || book.tags.length === 0;
  const missingPages = !book.pages;
  if (missingTags && (!cached.tags || cached.tags.length === 0)) return false;
  if (missingPages && !cached.pages) return false;
  return true;
}

function needsEnrichment(book) {
  return (
    ((!book.tags || book.tags.length === 0) || !book.pages) &&
    (book.sourceKey || book.isbn || book.title)
  );
}

async function fetchEnrichData(book) {
  let categories = [];
  let fetchedPages = 0;

  try {
    // 1. Google Books by sourceKey
    if (book.sourceKey && !book.sourceKey.startsWith("/works/")) {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${book.sourceKey}`);
      if (res.ok) {
        const data = await res.json();
        categories = data.volumeInfo?.categories || [];
        fetchedPages = data.volumeInfo?.pageCount || 0;
      }
    }

    // 2. Google Books search fallback
    if (!categories.length || !fetchedPages) {
      const queryStr = book.isbn
        ? `isbn:${book.isbn}`
        : `${book.title}${book.author ? ` ${book.author}` : ""}`;
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryStr)}&maxResults=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items?.[0]) {
          const info = data.items[0].volumeInfo;
          if (!categories.length) categories = info?.categories || [];
          if (!fetchedPages) fetchedPages = info?.pageCount || 0;
        }
      }
    }

    // 3. Open Library fallback
    if (!categories.length || !fetchedPages) {
      const fieldsParam =
        "&fields=key,title,author_name,number_of_pages_median,first_publish_year,subject,cover_i,isbn";
      const queryParams = book.isbn
        ? `isbn=${book.isbn}`
        : `q=${encodeURIComponent(book.title + (book.author ? ` ${book.author}` : ""))}`;
      const res = await fetch(`https://openlibrary.org/search.json?limit=1&${queryParams}${fieldsParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.docs?.[0]) {
          const doc = data.docs[0];
          if (!categories.length) categories = doc.subject ? doc.subject.slice(0, 3) : [];
          if (!fetchedPages) fetchedPages = doc.number_of_pages_median || doc.number_of_pages || 0;
        }
      }
    }
  } catch (err) {
    console.error(`[Enrich] fetch error for "${book.title}":`, err);
    return null;
  }

  return { tags: cleanTags(categories), pages: fetchedPages };
}

export function useBooksController(user, notify) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Refs let the enrichment engine read the latest values without
  // re-subscribing the Firestore listener on every change.
  const booksRef = useRef([]);
  const booksLoadingRef = useRef(false);
  const enrichedRef = useRef(new Set());
  const debounceRef = useRef(null);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);
  useEffect(() => {
    booksLoadingRef.current = booksLoading;
  }, [booksLoading]);
  useEffect(() => {
    loadCacheFromStorage();
  }, []);

  /* ---------------------------- CRUD ---------------------------- */
  function bookDoc(bookId) {
    if (!user) throw new Error("Anonymous session error");
    return doc(db, "users", user.uid, "books", bookId);
  }

  async function saveBook(book, message) {
    if (!user) {
      notify("Sign in to save books.", "error");
      return;
    }

    const nextBook = normalizeBook(book);
    setBooks((current) => {
      const exists = current.some((item) => item.id === nextBook.id);
      return exists
        ? current.map((item) => (item.id === nextBook.id ? nextBook : item))
        : [nextBook, ...current];
    });

    try {
      await setDoc(bookDoc(nextBook.id), nextBook, { merge: true });
      setSaveError("");
      if (message) notify(message);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to sync records with the database.");
      notify("Sync failed.", "error");
    }
  }

  async function saveManyBooks(nextBooks, message) {
    if (!user || !nextBooks.length) return;

    const batch = writeBatch(db);
    const normalized = nextBooks.map(normalizeBook);
    normalized.forEach((book) => {
      batch.set(bookDoc(book.id), book, { merge: true });
    });

    setBooks((current) => {
      const byId = new Map(current.map((book) => [book.id, book]));
      normalized.forEach((book) => byId.set(book.id, book));
      return [...byId.values()].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    });

    try {
      await batch.commit();
      setSaveError("");
      if (message) notify(message);
    } catch (err) {
      console.error(err);
      setSaveError("Batch import failed to sync to database.");
      notify("Import sync failed.", "error");
    }
  }

  async function deleteBook(book) {
    setBooks((current) => current.filter((item) => item.id !== book.id));
    try {
      await deleteDoc(bookDoc(book.id));
      setSaveError("");
      notify("Book removed from shelf.");
    } catch (err) {
      console.error(err);
      setSaveError("Failed to delete the book from cloud storage.");
      notify("Failed to delete book.", "error");
    }
  }

  async function updateBook(id, updates) {
    // Read from the ref so enrichment (which may use a slightly stale
    // closure) still resolves the latest book.
    const existing = booksRef.current.find((book) => book.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updates, updatedAt: Date.now() };

    if (updates.status === "want") {
      merged.currentPage = 0;
      merged.startedAt = null;
      merged.finishedAt = null;
    }

    if (updates.status === "reading") {
      merged.startedAt = merged.startedAt || Date.now();
      merged.finishedAt = null;
      if (merged.pages && merged.currentPage === 0) merged.currentPage = 1;
    }

    if (updates.status === "done") {
      merged.currentPage = merged.pages || merged.currentPage;
      merged.finishedAt = merged.finishedAt || Date.now();
    }

    if (updates.currentPage !== undefined) {
      merged.currentPage = clamp(toNumber(updates.currentPage, 0), 0, merged.pages || 999999);
      if (merged.pages && merged.currentPage >= merged.pages) {
        merged.status = "done";
        merged.finishedAt = merged.finishedAt || Date.now();
      } else if (merged.currentPage > 0 && merged.status === "want") {
        merged.status = "reading";
        merged.startedAt = merged.startedAt || Date.now();
      } else if (merged.status === "done" && merged.pages && merged.currentPage < merged.pages) {
        merged.status = "reading";
        merged.finishedAt = null;
      }
    }

    await saveBook(normalizeBook(merged));
  }

  async function quickAdd(volumeForm) {
    const incoming = createBookFromForm(volumeForm);
    await saveBook(incoming, "Added to library.");
  }

  async function submitBook(editingId, form) {
    if (!form.title.trim()) return;
    const existing = editingId ? booksRef.current.find((book) => book.id === editingId) : null;
    await saveBook(
      createBookFromForm(form, existing),
      editingId ? "Book details updated." : "Book added to shelf."
    );
  }

  /* ----------------------- Enrichment engine ----------------------- */
  async function enrichBook(book) {
    const key = enrichKey(book);

    // Already in cache -> apply directly, no network.
    const cached = detailsCache.get(key);
    if (cached) {
      const updates = buildUpdates(book, cached);
      if (Object.keys(updates).length > 0) {
        try {
          await updateBook(book.id, updates);
        } catch {
          /* ignore */
        }
      }
      enrichedRef.current.add(book.id);
      return;
    }

    // Dedupe concurrent requests for the same book.
    if (inflight.has(key)) {
      await inflight.get(key);
      return;
    }

    const promise = (async () => {
      const data = await fetchEnrichData(book);
      if (data) {
        detailsCache.set(key, data);
        persistCache();
      }
      return data;
    })();
    inflight.set(key, promise);

    try {
      const data = await promise;
      if (data) {
        const updates = buildUpdates(book, data);
        if (Object.keys(updates).length > 0) {
          await updateBook(book.id, updates);
        }
      }
      // Mark enriched only after a successful pass so failures retry.
      enrichedRef.current.add(book.id);
    } catch (err) {
      console.error(`[Enrich] failed for "${book.title}":`, err);
    } finally {
      inflight.delete(key);
    }
  }

  async function runEnrichmentBatch() {
    if (booksLoadingRef.current) {
      scheduleEnrichment();
      return;
    }
    const list = booksRef.current;
    const book = list.find(
      (b) =>
        !enrichedRef.current.has(b.id) &&
        needsEnrichment(b) &&
        !inflight.has(enrichKey(b)) &&
        !cacheCovers(b)
    );
    if (!book) return;
    await enrichBook(book);
    // Chain to the next book after a short gap (gentle on the API).
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runEnrichmentBatch, 600);
  }

  function scheduleEnrichment() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runEnrichmentBatch, 1200);
  }

  /* ----------------------- Firestore listener ----------------------- */
  useEffect(() => {
    if (!user) {
      setBooks([]);
      setBooksLoading(false);
      setSaveError("");
      enrichedRef.current = new Set();
      return undefined;
    }

    setBooksLoading(true);
    const booksCollection = collection(db, "users", user.uid, "books");
    const booksQuery = query(booksCollection, orderBy("addedAt", "desc"));

    return onSnapshot(
      booksQuery,
      (snapshot) => {
        setBooks(snapshot.docs.map((item) => normalizeBook({ id: item.id, ...item.data() })));
        setBooksLoading(false);
        setSaveError("");
        // Debounced trigger: only scan after books settle.
        scheduleEnrichment();
      },
      (error) => {
        console.error("Firestore subscription error:", error);
        setBooksLoading(false);
        setSaveError(`Failed to fetch Cloud records: ${error.message} (${error.code})`);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ----------------------- Import / export ----------------------- */
  async function migrateLocalBooks() {
    const localBooks = loadBooks();
    if (!localBooks.length) {
      return;
    }

    const seen = new Set(books.map((book) => book.sourceKey || book.id));
    const additions = localBooks.filter((book) => {
      const key = book.sourceKey || book.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await saveManyBooks(
      additions,
      additions.length ? "Local library merged to Cloud shelf." : "No new books to import."
    );
    localStorage.removeItem("personal-book-ledger:v1");
  }

  function exportLedger() {
    const payload = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        books,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `book-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Ledger backup exported.");
  }

  async function importLedger(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed.books;
      if (!Array.isArray(incoming)) throw new Error("Invalid format");
      const normalized = incoming.map(normalizeBook);

      const seen = new Set(books.map((book) => book.sourceKey || book.id));
      const additions = normalized.filter((book) => {
        const key = book.sourceKey || book.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      await saveManyBooks(
        additions,
        additions.length ? "Ledger import complete." : "No new books to import."
      );
    } catch {
      notify("Failed to parse import backup file.", "error");
    }
  }

  return {
    books,
    booksLoading,
    saveError,
    saveBook,
    saveManyBooks,
    deleteBook,
    updateBook,
    quickAdd,
    submitBook,
    exportLedger,
    importLedger,
    migrateLocalBooks,
  };
}
