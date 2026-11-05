/**
 * Owns the signed-in user's library: the live Firestore subscription, CRUD,
 * JSON import/export and background metadata enrichment.
 *
 * Writes rely on Firestore's local cache for optimistic UI: a pending write
 * shows up in the next snapshot immediately, and if the server rejects it the
 * SDK emits another snapshot without it, so the UI rolls back on its own.
 */
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
import { db } from "../../services/firebase";
import { changedFields, contentKey, createBookFromForm, findNewBooks, normalizeBook, parseLedger } from "../../domain/book";
import { findDuplicate } from "../../domain/library";
import { awaitAck } from "../../shared/lib/awaitAck";
import { buildUpdates, lookupDetails, needsEnrichment } from "../../services/enrichment";

const BATCH_LIMIT = 400; // Firestore allows 500 operations per batch
const MAX_IMPORT_BOOKS = 5000;
const ENRICH_DELAY_MS = 800; // gentle on the public APIs
const OFFLINE_NOTE = "Saved on this device. It will sync when you are back online.";

export function useBooksController(user, notify) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [enrichTick, setEnrichTick] = useState(0);

  // Refs let async work read the latest values without re-subscribing.
  const booksRef = useRef([]);
  const userIdRef = useRef(null);
  const attemptedRef = useRef(new Set()); // book ids already looked up this session
  const enrichingRef = useRef(false);
  const addingRef = useRef(new Set()); // content keys of quick-adds still in flight

  booksRef.current = books;
  userIdRef.current = user?.uid ?? null;

  function bookDoc(bookId) {
    if (!user) throw new Error("Not signed in");
    return doc(db, "users", user.uid, "books", bookId);
  }

  /* ---------------------------- CRUD ---------------------------- */

  /**
   * Runs one Firestore write and reports the outcome. Resolves true when the
   * write is confirmed *or* safely queued while offline (it never hangs), and
   * false when it was rejected, in which case the error is shown.
   */
  async function commit(write, { message, failure, failureToast = "Sync failed." }) {
    const reportFailure = () => {
      setSaveError(failure);
      notify(failureToast, "error");
    };
    try {
      const result = await awaitAck(write, (lateError) => {
        console.error(lateError);
        reportFailure();
      });
      setSaveError("");
      if (result === "queued") notify(OFFLINE_NOTE);
      else if (message) notify(message);
      return true;
    } catch (err) {
      console.error(err);
      reportFailure();
      return false;
    }
  }

  /** Saves a whole book (a new one, or a full edit). Resolves true on success. */
  async function saveBook(book, message) {
    if (!user) {
      notify("Sign in to save books.", "error");
      return false;
    }
    const nextBook = normalizeBook(book);
    return commit(setDoc(bookDoc(nextBook.id), nextBook, { merge: true }), {
      message,
      failure: "Failed to sync records with the database.",
    });
  }

  /** Writes many books in batches of BATCH_LIMIT. Returns true if all succeeded. */
  async function saveManyBooks(nextBooks, message) {
    if (!user || !nextBooks.length) return true;
    const normalized = nextBooks.map((book) => normalizeBook(book));

    try {
      for (let i = 0; i < normalized.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        normalized.slice(i, i + BATCH_LIMIT).forEach((book) => {
          batch.set(bookDoc(book.id), book, { merge: true });
        });
        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
      }
      setSaveError("");
      if (message) notify(message);
      return true;
    } catch (err) {
      console.error(err);
      setSaveError("Batch update failed to sync to database.");
      notify("Sync failed.", "error");
      return false;
    }
  }

  async function deleteBook(book) {
    return commit(deleteDoc(bookDoc(book.id)), {
      message: "Book removed from shelf.",
      failure: "Failed to delete the book from cloud storage.",
      failureToast: "Failed to delete book.",
    });
  }

  /**
   * Changes some fields of a stored book. Only the fields that actually change
   * are written, so two quick edits to different fields (say pages and notes
   * saved together when a dialog closes) cannot overwrite each other.
   */
  async function updateBook(id, updates) {
    const existing = booksRef.current.find((book) => book.id === id);
    if (!existing) return false;
    // normalizeBook (via reconcileBookStatus) keeps status and progress consistent
    // and honours an explicit status choice because it knows the previous copy.
    const next = normalizeBook({ ...existing, ...updates }, { stamp: true, previous: existing });
    const diff = changedFields(existing, next);
    return commit(setDoc(bookDoc(id), diff, { merge: true }), { failure: "Failed to sync records with the database." });
  }

  /** Applies per-book field changes ({ id, updates }[]) in one batched write. */
  async function updateManyBooks(changes, message) {
    const next = changes
      .map(({ id, updates }) => {
        const existing = booksRef.current.find((book) => book.id === id);
        return existing ? normalizeBook({ ...existing, ...updates }, { stamp: true, previous: existing }) : null;
      })
      .filter(Boolean);
    return saveManyBooks(next, message);
  }

  /**
   * Adds a catalogue book to the library. A book already in the library (same
   * source, or same title and author) is not added again, and neither is one
   * whose add is still in flight, so a double click cannot create two copies.
   */
  async function quickAdd(volumeForm) {
    const incoming = createBookFromForm(volumeForm);
    const key = contentKey(incoming);
    if (addingRef.current.has(key) || findDuplicate(booksRef.current, incoming)) {
      notify("That book is already in your library.");
      return false;
    }
    addingRef.current.add(key);
    try {
      return await saveBook(incoming, "Added to library.");
    } finally {
      addingRef.current.delete(key);
    }
  }

  /** Saves the add/edit form. Resolves true when the book was saved. */
  async function submitBook(editingId, form) {
    if (!form.title.trim()) return false;
    const existing = editingId ? booksRef.current.find((book) => book.id === editingId) : null;
    return saveBook(createBookFromForm(form, existing), editingId ? "Book details updated." : "Book added to shelf.");
  }

  /* ----------------------- Firestore listener ----------------------- */
  useEffect(() => {
    attemptedRef.current = new Set();
    if (!user) {
      setBooks([]);
      setBooksLoading(false);
      setSaveError("");
      return undefined;
    }

    setBooksLoading(true);
    const booksQuery = query(collection(db, "users", user.uid, "books"), orderBy("addedAt", "desc"));

    return onSnapshot(
      booksQuery,
      (snapshot) => {
        setBooks(snapshot.docs.map((item) => normalizeBook({ id: item.id, ...item.data() })));
        setBooksLoading(false);
        setSaveError("");
      },
      (error) => {
        console.error("Firestore subscription error:", error);
        setBooksLoading(false);
        setSaveError(`Failed to fetch Cloud records: ${error.message} (${error.code})`);
      }
    );
  }, [user]);

  /* ----------------------- Enrichment queue ----------------------- */
  // Looks up one book at a time. Each book is attempted once per session, so a
  // failing lookup can never loop; `enrichTick` re-runs this effect when an
  // attempt finishes without changing `books`.
  useEffect(() => {
    if (!user || booksLoading || enrichingRef.current) return undefined;
    const next = books.find((b) => !attemptedRef.current.has(b.id) && needsEnrichment(b));
    if (!next) return undefined;

    const timer = setTimeout(async () => {
      const startedFor = userIdRef.current;
      enrichingRef.current = true;
      attemptedRef.current.add(next.id);
      try {
        const data = await lookupDetails(next);
        const latest = booksRef.current.find((b) => b.id === next.id);
        if (data && latest && userIdRef.current === startedFor) {
          const updates = buildUpdates(latest, data);
          if (Object.keys(updates).length) await updateBook(latest.id, updates);
        }
      } catch (err) {
        console.error(`[Enrich] failed for "${next.title}":`, err);
      } finally {
        enrichingRef.current = false;
        setEnrichTick((tick) => tick + 1);
      }
    }, ENRICH_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, books, booksLoading, enrichTick]);

  /* ----------------------- Import / export ----------------------- */
  function exportLedger() {
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), books },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `book-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    // Revoking at once can cancel the download in some browsers; give it a moment.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Ledger backup exported.");
  }

  async function importLedger(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    let incoming;
    try {
      incoming = parseLedger(await file.text());
    } catch {
      notify("That file is not a valid ledger backup.", "error");
      return;
    }
    if (incoming.length > MAX_IMPORT_BOOKS) {
      notify(`Backup has too many books (max ${MAX_IMPORT_BOOKS}).`, "error");
      return;
    }

    const additions = findNewBooks(books, incoming);
    if (!additions.length) {
      notify("No new books to import.");
      return;
    }
    await saveManyBooks(additions, `Imported ${additions.length} book${additions.length === 1 ? "" : "s"}.`);
  }

  return {
    books,
    booksLoading,
    saveError,
    saveBook,
    saveManyBooks,
    deleteBook,
    updateBook,
    updateManyBooks,
    quickAdd,
    submitBook,
    exportLedger,
    importLedger,
  };
}
