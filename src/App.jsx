import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Download,
  Import,
  Library,
  List,
  Grid3X3,
  Plus,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  BookOpen,
  Heart,
  Sun,
  Moon,
  CheckCircle,
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
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
import { auth, db, googleProvider } from "./firebase";

// Modular Component Imports
import LoadingScreen from "./components/LoadingScreen";
import AuthScreen from "./components/AuthScreen";
import AccountCard from "./components/AccountCard";
import MetricCard from "./components/MetricCard";
import BookCard from "./components/BookCard";
import BookModal from "./components/BookModal";
import LandingPage from "./components/LandingPage";
import EmptyState from "./components/EmptyState";
import ReadingStack from "./components/ReadingStack";
import LoadingPanel from "./components/LoadingPanel";
import Toast from "./components/Toast";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import BookDetailsModal from "./components/BookDetailsModal";

// Constants & Helpers
import { STATUSES, SORTS, progressFor } from "./components/constants";

const STORAGE_KEY = "personal-book-ledger:v1";

const EMPTY_FORM = {
  title: "",
  author: "",
  pages: "",
  currentPage: "",
  status: "want",
  rating: 0,
  tags: "",
  notes: "",
  description: "",
  genres: "",
  publishedYear: "",
  isbn: "",
  coverId: null,
  coverUrl: "",
  sourceKey: "",
};

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBook(raw) {
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
    addedAt,
    startedAt: raw.startedAt || (status === "reading" ? addedAt : null),
    finishedAt: done ? raw.finishedAt || Date.now() : raw.finishedAt || null,
    updatedAt: raw.updatedAt || Date.now(),
  };
}

function loadBooks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const incoming = Array.isArray(parsed) ? parsed : parsed.books;
    return Array.isArray(incoming) ? incoming.map(normalizeBook) : [];
  } catch {
    return [];
  }
}

function formFromBook(book) {
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
  };
}

function createBookFromForm(form, existing = null) {
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
    addedAt: previous.addedAt || now,
    startedAt:
      status === "reading" ? previous.startedAt || now : status === "want" ? null : previous.startedAt,
    finishedAt: status === "done" ? previous.finishedAt || now : null,
    updatedAt: now,
  });
}

function authMessage(error) {
  console.error("Firebase Auth Error:", error);
  const code = error?.code || "";
  const msg = error?.message || "";
  
  if (code.includes("popup-closed-by-user")) return "The sign-in popup was closed before completion.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "The credentials entered were not accepted.";
  }
  if (code.includes("email-already-in-use")) return "An account already exists for this email.";
  if (code.includes("weak-password")) return "Password must be at least 6 characters.";
  if (code.includes("invalid-email")) return "Invalid email address formatting.";
  if (code.includes("operation-not-allowed")) {
    return "Google Sign-In is not enabled. Go to Firebase Console > Authentication > Sign-in method and enable Google.";
  }
  if (code.includes("unauthorized-domain")) {
    return "This local domain is not authorized. Add it under Firebase Authentication > Settings > Authorized Domains.";
  }
  return `Authentication failed: ${msg} (${code})`;
}

// Synchronously initialize theme to prevent flash of unstyled screen on browser refresh
const initialTheme = localStorage.getItem("book-ledger:theme") || "dark";
document.documentElement.setAttribute("data-theme", initialTheme);

function App() {
  const [books, setBooks] = useState([]);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [booksLoading, setBooksLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirmBook, setDeleteConfirmBook] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [localBackupCount, setLocalBackupCount] = useState(() => loadBooks().length);
  const [showLanding, setShowLanding] = useState(true);
  const checkedIdsRef = useRef(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("book-ledger:theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("book-ledger:theme", theme);
  }, [theme]);

  useEffect(() => {
    setCurrentPage(1);
  }, [libraryQuery, statusFilter, sortBy]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const fileInputRef = useRef(null);
  const booksRef = useRef([]);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        setAuthError("");
        if (!nextUser) {
          setBooks([]);
          setBooksLoading(false);
          closeModal();
        }
      },
      () => {
        setAuthReady(true);
        setAuthError("Failed to fetch sign-in session state.");
      }
    );
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    setBooksLoading(true);
    const booksRef = collection(db, "users", user.uid, "books");
    const booksQuery = query(booksRef, orderBy("addedAt", "desc"));

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

  // Background effect to enrich books with genre tags and page counts from the API using an interval scanner
  useEffect(() => {
    if (!user) return undefined;

    const interval = setInterval(async () => {
      if (booksLoading) return;
      
      const latestBooks = booksRef.current;
      if (!latestBooks || !latestBooks.length) return;

      // Find the first book that is missing tags OR has 0 pages, and hasn't been checked yet
      const bookToEnrich = latestBooks.find(
        (b) =>
          !checkedIdsRef.current.has(b.id) &&
          ((!b.tags || b.tags.length === 0) || !b.pages) &&
          (b.sourceKey || b.isbn || b.title)
      );

      if (!bookToEnrich) return;

      // Mark as checked immediately to prevent duplicate runs
      checkedIdsRef.current.add(bookToEnrich.id);
      
      console.log(`[Auto-Enrich] Interval scanner querying API details for: "${bookToEnrich.title}"`);
      try {
        let categories = [];
        let fetchedPages = 0;
        
        // 1. Try fetching via Google Books using sourceKey
        if (bookToEnrich.sourceKey && !bookToEnrich.sourceKey.startsWith("/works/")) {
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookToEnrich.sourceKey}`);
          if (res.ok) {
            const data = await res.json();
            categories = data.volumeInfo?.categories || [];
            fetchedPages = data.volumeInfo?.pageCount || 0;
          }
        }
        
        // 2. Fallback to general Google Books search if no pages/categories found yet
        if (!categories.length || !fetchedPages) {
          const queryStr = bookToEnrich.isbn 
            ? `isbn:${bookToEnrich.isbn}` 
            : `${bookToEnrich.title}${bookToEnrich.author ? ` ${bookToEnrich.author}` : ""}`;
          
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryStr)}&maxResults=1`);
          if (res.ok) {
            const data = await res.json();
            if (data.items?.[0]) {
              const info = data.items[0].volumeInfo;
              if (!categories.length) categories = info?.categories || [];
              if (!fetchedPages) fetchedPages = info?.pageCount || 0;
            }
          }
        }

        // 3. Fallback to Open Library search if no pages/categories found yet
        if (!categories.length || !fetchedPages) {
          const queryParams = bookToEnrich.isbn 
            ? `isbn=${bookToEnrich.isbn}` 
            : `q=${encodeURIComponent(bookToEnrich.title + (bookToEnrich.author ? ` ${bookToEnrich.author}` : ""))}`;
          
          const res = await fetch(`https://openlibrary.org/search.json?limit=1&${queryParams}`);
          if (res.ok) {
            const data = await res.json();
            if (data.docs?.[0]) {
              const doc = data.docs[0];
              if (!categories.length) categories = doc.subject ? doc.subject.slice(0, 3) : [];
              if (!fetchedPages) fetchedPages = doc.number_of_pages_median || doc.number_of_pages || 0;
            }
          }
        }

        // Build the updates object
        const updates = {};
        
        // Update tags if they are currently missing
        if (!bookToEnrich.tags || bookToEnrich.tags.length === 0) {
          if (categories && categories.length > 0) {
            const cleanTags = categories
              .map((cat) => typeof cat === "string" ? cat.split("/").map(s => s.trim()) : [])
              .flat()
              .map((cat) => cat.trim())
              .filter((cat) => cat.length > 1 && cat.length < 25);
            const uniqueTags = [...new Set(cleanTags)].slice(0, 3);
            updates.tags = uniqueTags.length > 0 ? uniqueTags : ["General"];
          } else {
            updates.tags = ["General"];
          }
        }

        // Update pages if they are currently 0
        if (!bookToEnrich.pages && fetchedPages) {
          updates.pages = fetchedPages;
        }

        // Save updates to Firestore if there are any
        if (Object.keys(updates).length > 0) {
          console.log(`[Auto-Enrich] Interval scanner updating details for "${bookToEnrich.title}":`, updates);
          await updateBook(bookToEnrich.id, updates);
        }
      } catch (err) {
        console.error(`[Auto-Enrich] Interval scanner failed for "${bookToEnrich.title}":`, err);
      }
    }, 4000); // Scan every 4 seconds to sequence updates cleanly

    return () => clearInterval(interval);
  }, [books, booksLoading, user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const statusCounts = Object.fromEntries(Object.keys(STATUSES).map((key) => [key, 0]));
    let pagesRead = 0;
    let ratedCount = 0;
    let ratingSum = 0;
    let finishedThisYear = 0;
    let favorites = 0;

    books.forEach((book) => {
      statusCounts[book.status] += 1;
      if (book.favorite) favorites += 1;
      pagesRead += book.status === "done" && book.pages ? book.pages : book.currentPage || 0;
      if (book.rating) {
        ratedCount += 1;
        ratingSum += book.rating;
      }
      if (
        book.status === "done" &&
        book.finishedAt &&
        new Date(book.finishedAt).getFullYear() === year
      ) {
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
  }, [books]);

  const visibleBooks = useMemo(() => {
    const queryStr = libraryQuery.trim().toLowerCase();
    const filtered = books.filter((book) => {
      if (statusFilter === "favorites") {
        if (!book.favorite) return false;
      } else if (statusFilter !== "all" && book.status !== statusFilter) {
        return false;
      }
      if (!queryStr) return true;
      return [
        book.title,
        book.author,
        book.publishedYear,
        book.isbn,
        book.notes,
        ...(book.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(queryStr);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "author") return a.author.localeCompare(b.author);
      if (sortBy === "progress") return progressFor(b) - progressFor(a);
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "finished") return (b.finishedAt || 0) - (a.finishedAt || 0);
      return (b.addedAt || 0) - (a.addedAt || 0);
    });
  }, [books, libraryQuery, sortBy, statusFilter]);

  const BOOKS_PER_PAGE = 8;
  const totalPages = Math.ceil(visibleBooks.length / BOOKS_PER_PAGE);
  const activePage = Math.min(currentPage, totalPages || 1);
  const startIndex = (activePage - 1) * BOOKS_PER_PAGE;
  const paginatedBooks = useMemo(() => {
    return visibleBooks.slice(startIndex, startIndex + BOOKS_PER_PAGE);
  }, [visibleBooks, startIndex]);

  const currentlyReading = useMemo(
    () =>
      books
        .filter((book) => book.status === "reading")
        .sort((a, b) => progressFor(b) - progressFor(a))
        .slice(0, 4),
    [books]
  );

  const recentlyFinished = useMemo(
    () =>
      books
        .filter((book) => book.status === "done")
        .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
        .slice(0, 4),
    [books]
  );

  const coverStrip = useMemo(() => books.slice(0, 8), [books]);

  function notify(message, type = "success") {
    setToastType(type);
    setToast(message);
  }

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

  async function signInWithGoogle() {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(authMessage(error));
    }
  }

  async function signInWithEmail({ email, password, mode }) {
    setAuthError("");
    try {
      if (mode === "create") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setAuthError(authMessage(error));
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      notify("Signed out successfully.");
    } catch {
      notify("Could not complete sign out.", "error");
    }
  }

  async function migrateLocalBooks() {
    const localBooks = loadBooks();
    if (!localBooks.length) {
      setLocalBackupCount(0);
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
    localStorage.removeItem(STORAGE_KEY);
    setLocalBackupCount(0);
  }

  function openNewBook() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditBook(book) {
    setEditingId(book.id);
    setForm(formFromBook(book));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function quickAdd(volumeForm) {
    const incoming = createBookFromForm(volumeForm);
    await saveBook(incoming, "Added to library.");
  }

  async function submitBook(event) {
    event.preventDefault();
    if (!form.title.trim()) return;

    const existing = editingId ? books.find((book) => book.id === editingId) : null;
    await saveBook(
      createBookFromForm(form, existing),
      editingId ? "Book details updated." : "Book added to shelf."
    );
    closeModal();
  }

  function deleteBook(book) {
    setDeleteConfirmBook(book);
  }

  async function executeDeleteBook(book) {
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
    const existing = books.find((book) => book.id === id);
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

  function clearFilters() {
    setStatusFilter("all");
    setLibraryQuery("");
    setSortBy("recent");
  }

  if (!authReady) {
    return <LoadingScreen label="Connecting with Database Ledger" />;
  }

  if (!user && showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (!user) {
    return (
      <AuthScreen
        error={authError}
        onEmailSubmit={signInWithEmail}
        onGoogleSignIn={signInWithGoogle}
        onBackToLanding={() => setShowLanding(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark-img-wrap" aria-hidden="true">
            <img src="/stack-of-books.png" alt="" className="brand-logo-img" />
          </div>
          <h1>Pusthaka</h1>
        </div>

        <div className="sidebar-divider" />

        {coverStrip.length > 0 && (
          <div className="cover-strip" aria-hidden="true">
            <div className="cover-strip-track">
              {[...coverStrip, ...coverStrip].map((book, i) => (
                <div
                  className="mini-spine"
                  key={`${book.id}-${i}`}
                  style={{
                    background: `linear-gradient(135deg, var(--cover-a, #1e293b), var(--cover-b, #475569))`,
                  }}
                >
                  {book.coverUrl ? <img src={book.coverUrl} alt="" /> : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-label">Collection</div>
          <nav className="status-nav" aria-label="Shelf navigation">
            {[
              ["all", "All Books", Archive, stats.total],
              ...Object.entries(STATUSES).map(([key, value]) => [
                key,
                value.longLabel,
                value.icon,
                stats[key],
              ]),
              ["favorites", "Favorites", Heart, stats.favorites],
            ].map(([key, label, Icon, count]) => (
              <button
                className={statusFilter === key ? "nav-item active" : "nav-item"}
                key={key}
                onClick={() => setStatusFilter(key)}
                type="button"
              >
                <Icon size={17} />
                <span>{label}</span>
                <strong className="nav-item-badge">{count}</strong>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-actions">
          <AccountCard user={user} onSignOut={handleSignOut} />
          <button className="button primary full add-book-trigger" onClick={openNewBook} type="button">
            <Plus size={16} />
            <span>Add Book</span>
          </button>
          <div className="split-actions">
            <button className="button ghost" onClick={exportLedger} title="Export Ledger Backup" type="button">
              <Download size={15} />
              <span>Export</span>
            </button>
            <button
              className="button ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Import Ledger Backup"
              type="button"
            >
              <Import size={15} />
              <span>Import</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importLedger}
          />
        </div>
        </aside>

      <main className="workspace">
        <header className="dashboard-header">
          <div className="dashboard-header-top">
            <div className="dashboard-title-group">
              <p className="section-kicker">Library Dashboard</p>
              <h2 className="dashboard-title">My Library</h2>
            </div>
            <div className="topbar-actions">
              <button
                className="button primary add-book-header-btn"
                onClick={openNewBook}
                title="Add New Book"
                type="button"
              >
                <Plus size={15} />
                <span>Add Book</span>
              </button>
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                type="button"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>

          <div className="stats-strip" aria-label="Shelf stats summary">
            <div className="stat-item">
              <Library size={15} className="stat-icon teal" />
              <strong>{stats.total}</strong>
              <span>Total Books</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <CheckCircle size={15} className="stat-icon plum" />
              <strong>{stats.done}</strong>
              <span>Finished</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <BookOpen size={15} className="stat-icon gold" />
              <strong>{stats.reading}</strong>
              <span>Reading</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <CalendarDays size={15} className="stat-icon plum" />
              <strong>{stats.finishedThisYear}</strong>
              <span>Completed {new Date().getFullYear()}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <Star size={15} className="stat-icon coral" />
              <strong>{stats.averageRating}</strong>
              <span>Avg Rating</span>
            </div>
          </div>
        </header>

        <section className="content-layout">
          <div className="library-panel">
            <div className="toolbar">
              <label className="search-field">
                <Search size={18} />
                <input
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="Filter by title, author, tags, notes..."
                />
              </label>

              <div className="select-wrap library-sort-select">
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  {SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </div>

              <div className="view-toggle" aria-label="Toggle Layout Grid/List">
                <button
                  className={view === "grid" ? "active" : ""}
                  onClick={() => setView("grid")}
                  aria-label="Grid View"
                  title="Grid Layout"
                  type="button"
                >
                  <Grid3X3 size={15} />
                </button>
                <button
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                  aria-label="List View"
                  title="List Layout"
                  type="button"
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {booksLoading ? (
              <LoadingPanel label="Connecting with Database ledger..." />
            ) : visibleBooks.length ? (
              <>
                <div className={view === "grid" ? "book-grid" : "book-list"}>
                  {paginatedBooks.map((book) => (
                    <BookCard
                      book={book}
                      key={book.id}
                      layout={view}
                      onDelete={deleteBook}
                      onEdit={openEditBook}
                      onUpdate={updateBook}
                      onViewDetails={setDetailsBook}
                    />
                  ))}
                </div>

                {/* Folio Pagination Footer */}
                {totalPages > 1 && (
                  <div className="pagination-wrapper">
                    <div className="pagination-info">
                      Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + BOOKS_PER_PAGE, visibleBooks.length)}</strong> of <strong>{visibleBooks.length}</strong> books
                    </div>
                    <div className="pagination-buttons">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={activePage === 1}
                        aria-label="Previous Page"
                        type="button"
                      >
                        <ChevronLeft size={15} />
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            className={`pagination-btn page-num ${activePage === pageNum ? "active" : ""}`}
                            onClick={() => setCurrentPage(pageNum)}
                            type="button"
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={activePage === totalPages}
                        aria-label="Next Page"
                        type="button"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState hasBooks={books.length > 0} onAdd={openNewBook} onReset={clearFilters} />
            )}
          </div>

          <aside className="insights-panel">
            <div className="insight-block">
              <div className="panel-heading">
                <BarChart3 size={15} />
                <h3>Reading Progress</h3>
                <span className="panel-badge">{stats.completionRate}% done</span>
              </div>
              <div className="completion-meter">
                <span style={{ width: `${stats.completionRate}%` }} />
              </div>
              <div className="status-bars">
                {Object.entries(STATUSES).map(([key, status]) => (
                  <div className="status-bar-row" key={key}>
                    <span className="status-bar-label">{status.longLabel}</span>
                    <div className="status-bar-track">
                      <i
                        style={{
                          width: `${stats.total ? (stats[key] / stats.total) * 100 : 0}%`,
                          background: status.color,
                        }}
                      />
                    </div>
                    <strong>{stats[key]}</strong>
                  </div>
                ))}
              </div>
            </div>

            <ReadingStack title="Reading Now" books={currentlyReading} empty="No active books." />
            <ReadingStack title="Recently Finished" books={recentlyFinished} empty="No books completed yet." />
          </aside>
        </section>
      </main>

      {modalOpen && (
        <BookModal
          books={books}
          editing={Boolean(editingId)}
          form={form}
          onClose={closeModal}
          onFormChange={setForm}
          onSubmit={submitBook}
          quickAdd={quickAdd}
        />
      )}

      {toast && <Toast message={toast} type={toastType} />}

      {deleteConfirmBook && (
        <DeleteConfirmModal
          book={deleteConfirmBook}
          onCancel={() => setDeleteConfirmBook(null)}
          onConfirm={async () => {
            const bookToDelete = deleteConfirmBook;
            setDeleteConfirmBook(null);
            await executeDeleteBook(bookToDelete);
          }}
        />
      )}

      {detailsBook && (
        <BookDetailsModal
          book={books.find((b) => b.id === detailsBook.id) || detailsBook}
          onClose={() => setDetailsBook(null)}
        />
      )}
    </div>
  );
}

export default App;
