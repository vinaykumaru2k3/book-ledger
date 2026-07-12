import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  BookCheck,
  BookMarked,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Edit3,
  Grid3X3,
  Heart,
  Import,
  Library,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const STORAGE_KEY = "personal-book-ledger:v1";

const STATUSES = {
  want: {
    label: "Want",
    longLabel: "Want to read",
    color: "#b45f43",
    icon: Bookmark,
  },
  reading: {
    label: "Reading",
    longLabel: "Reading",
    color: "#2d7d73",
    icon: BookOpen,
  },
  done: {
    label: "Finished",
    longLabel: "Finished",
    color: "#7356a6",
    icon: BookCheck,
  },
};

const SORTS = [
  { value: "recent", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "progress", label: "Progress" },
  { value: "rating", label: "Rating" },
  { value: "finished", label: "Recently finished" },
];

const COVER_PALETTE = [
  ["#203f63", "#e0a83e", "#f4efe5"],
  ["#7b3152", "#ef805f", "#fbf0de"],
  ["#285f5a", "#d5a83d", "#f5ead8"],
  ["#4b4f89", "#8bc7bd", "#f7ecdf"],
  ["#8c4b38", "#dac56f", "#fff5dc"],
  ["#2e5871", "#c9715b", "#f4f0e8"],
  ["#4f6840", "#d89e53", "#f7eedb"],
];

const EMPTY_FORM = {
  title: "",
  author: "",
  pages: "",
  currentPage: "",
  status: "want",
  rating: 0,
  tags: "",
  notes: "",
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

function coverUrlFromId(coverId, size = "M") {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : "";
}

function getCoverStyle(seed = "") {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [a, b, c] = COVER_PALETTE[total % COVER_PALETTE.length];
  return { "--cover-a": a, "--cover-b": b, "--cover-c": c };
}

function getInitials(title = "") {
  const parts = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "BL";
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function progressFor(book) {
  if (!book.pages) return book.status === "done" ? 100 : 0;
  return clamp(Math.round((book.currentPage / book.pages) * 100), 0, 100);
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
    publishedYear: raw.publishedYear ? String(raw.publishedYear) : "",
    isbn: raw.isbn ? String(raw.isbn) : "",
    coverId: raw.coverId || null,
    coverUrl: raw.coverUrl || coverUrlFromId(raw.coverId),
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
    publishedYear: book.publishedYear,
    isbn: book.isbn,
    coverId: book.coverId,
    coverUrl: book.coverUrl,
    sourceKey: book.sourceKey,
  };
}

function formFromDoc(doc) {
  const author = doc.author_name?.[0] || "";
  const isbn = doc.isbn?.[0] || "";
  const pages = doc.number_of_pages_median || "";
  return {
    ...EMPTY_FORM,
    title: doc.title || "",
    author,
    pages: pages ? String(pages) : "",
    publishedYear: doc.first_publish_year ? String(doc.first_publish_year) : "",
    isbn,
    coverId: doc.cover_i || null,
    coverUrl: coverUrlFromId(doc.cover_i),
    sourceKey: doc.key || "",
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

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function App() {
  const [books, setBooks] = useState(loadBooks);
  const [statusFilter, setStatusFilter] = useState("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState("grid");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, books }));
      setSaveError("");
    } catch {
      setSaveError("Could not save to this browser.");
    }
  }, [books]);

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

    books.forEach((book) => {
      statusCounts[book.status] += 1;
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
      averageRating: ratedCount ? (ratingSum / ratedCount).toFixed(1) : "0.0",
      completionRate: books.length ? Math.round((statusCounts.done / books.length) * 100) : 0,
    };
  }, [books]);

  const visibleBooks = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    const filtered = books.filter((book) => {
      if (statusFilter !== "all" && book.status !== statusFilter) return false;
      if (favoriteOnly && !book.favorite) return false;
      if (!query) return true;
      return [
        book.title,
        book.author,
        book.publishedYear,
        book.isbn,
        book.notes,
        ...book.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "author") return a.author.localeCompare(b.author);
      if (sortBy === "progress") return progressFor(b) - progressFor(a);
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "finished") return (b.finishedAt || 0) - (a.finishedAt || 0);
      return (b.addedAt || 0) - (a.addedAt || 0);
    });
  }, [books, favoriteOnly, libraryQuery, sortBy, statusFilter]);

  const currentlyReading = useMemo(
    () =>
      books
        .filter((book) => book.status === "reading")
        .sort((a, b) => progressFor(b) - progressFor(a))
        .slice(0, 4),
    [books],
  );

  const recentlyFinished = useMemo(
    () =>
      books
        .filter((book) => book.status === "done")
        .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
        .slice(0, 4),
    [books],
  );

  const coverStrip = books.slice(0, 7);

  function notify(message) {
    setToast(message);
  }

  function openNewBook() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setModalOpen(true);
  }

  function openEditBook(book) {
    setEditingId(book.id);
    setForm(formFromBook(book));
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  }

  async function searchOpenLibrary(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({
        q: query,
        limit: "12",
        fields:
          "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn",
      });
      const response = await fetch(`https://openlibrary.org/search.json?${params}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setSearchResults(data.docs || []);
      if (!data.docs?.length) setSearchError("No matches found.");
    } catch {
      setSearchResults([]);
      setSearchError("Book search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }

  function useSearchResult(doc) {
    setForm(formFromDoc(doc));
    notify("Book details added.");
  }

  function quickAdd(doc) {
    const incoming = createBookFromForm(formFromDoc(doc));
    setBooks((current) => [incoming, ...current]);
    notify("Added to your ledger.");
  }

  function submitBook(event) {
    event.preventDefault();
    if (!form.title.trim()) return;

    setBooks((current) => {
      if (!editingId) {
        return [createBookFromForm(form), ...current];
      }
      return current.map((book) =>
        book.id === editingId ? createBookFromForm(form, book) : book,
      );
    });
    notify(editingId ? "Book updated." : "Book added.");
    closeModal();
  }

  function deleteBook(book) {
    const confirmed = window.confirm(`Remove "${book.title}" from your ledger?`);
    if (!confirmed) return;
    setBooks((current) => current.filter((item) => item.id !== book.id));
    notify("Book removed.");
  }

  function updateBook(id, updates) {
    setBooks((current) =>
      current.map((book) => {
        if (book.id !== id) return book;
        const merged = { ...book, ...updates, updatedAt: Date.now() };

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

        return normalizeBook(merged);
      }),
    );
  }

  function exportLedger() {
    const payload = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        books,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `book-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Ledger exported.");
  }

  async function importLedger(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed.books;
      if (!Array.isArray(incoming)) throw new Error("Invalid ledger");
      const normalized = incoming.map(normalizeBook);

      setBooks((current) => {
        const seen = new Set(current.map((book) => book.sourceKey || book.id));
        const additions = normalized.filter((book) => {
          const key = book.sourceKey || book.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...additions, ...current];
      });
      notify("Ledger imported.");
    } catch {
      notify("Could not import that file.");
    }
  }

  function clearFilters() {
    setStatusFilter("all");
    setLibraryQuery("");
    setFavoriteOnly(false);
    setSortBy("recent");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Library size={24} />
          </div>
          <div>
            <div className="eyebrow">Private shelf</div>
            <h1>Book Ledger</h1>
          </div>
        </div>

        <div className="cover-strip" aria-hidden="true">
          {(coverStrip.length ? coverStrip : Array.from({ length: 5 })).map((book, index) => (
            <div
              className="mini-spine"
              key={book?.id || index}
              style={getCoverStyle(book?.title || `empty-${index}`)}
            >
              {book?.coverUrl ? <img src={book.coverUrl} alt="" /> : null}
            </div>
          ))}
        </div>

        <nav className="status-nav" aria-label="Library filters">
          {[
            ["all", "All books", Archive, stats.total],
            ...Object.entries(STATUSES).map(([key, value]) => [
              key,
              value.longLabel,
              value.icon,
              stats[key],
            ]),
          ].map(([key, label, Icon, count]) => (
            <button
              className={statusFilter === key ? "nav-item active" : "nav-item"}
              key={key}
              onClick={() => setStatusFilter(key)}
              type="button"
            >
              <Icon size={18} />
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button className="button primary full" onClick={openNewBook} type="button">
            <Plus size={18} />
            <span>Add book</span>
          </button>
          <div className="split-actions">
            <button className="button ghost" onClick={exportLedger} type="button">
              <Download size={17} />
              <span>Export</span>
            </button>
            <button
              className="button ghost"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload size={17} />
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
        <header className="topbar">
          <div>
            <p className="section-kicker">Your reading ledger</p>
            <h2>Library dashboard</h2>
          </div>
          <div className="topbar-actions">
            <button
              className={favoriteOnly ? "icon-button active" : "icon-button"}
              onClick={() => setFavoriteOnly((value) => !value)}
              aria-label="Show favorites"
              title="Show favorites"
              type="button"
            >
              <Heart size={19} />
            </button>
            <button className="button primary" onClick={openNewBook} type="button">
              <Plus size={18} />
              <span>Add book</span>
            </button>
          </div>
        </header>

        {saveError ? (
          <div className="notice" role="status">
            {saveError}
          </div>
        ) : null}

        <section className="metrics-grid" aria-label="Reading metrics">
          <MetricCard label="Books" value={stats.total} icon={Library} tone="teal" />
          <MetricCard label="Pages read" value={stats.pagesRead.toLocaleString()} icon={BookOpen} tone="gold" />
          <MetricCard label="Finished this year" value={stats.finishedThisYear} icon={CalendarDays} tone="plum" />
          <MetricCard label="Average rating" value={stats.averageRating} icon={Star} tone="coral" />
        </section>

        <section className="content-layout">
          <div className="library-panel">
            <div className="toolbar">
              <label className="search-field">
                <Search size={18} />
                <input
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="Search title, author, tag, note..."
                />
              </label>

              <div className="select-wrap">
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  {SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>

              <div className="view-toggle" aria-label="View mode">
                <button
                  className={view === "grid" ? "active" : ""}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  title="Grid view"
                  type="button"
                >
                  <Grid3X3 size={17} />
                </button>
                <button
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                  aria-label="List view"
                  title="List view"
                  type="button"
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {visibleBooks.length ? (
              <div className={view === "grid" ? "book-grid" : "book-list"}>
                {visibleBooks.map((book) => (
                  <BookCard
                    book={book}
                    key={book.id}
                    layout={view}
                    onDelete={deleteBook}
                    onEdit={openEditBook}
                    onUpdate={updateBook}
                  />
                ))}
              </div>
            ) : (
              <EmptyState hasBooks={books.length > 0} onAdd={openNewBook} onReset={clearFilters} />
            )}
          </div>

          <aside className="insights-panel">
            <div className="insight-block">
              <div className="panel-heading">
                <BarChart3 size={18} />
                <h3>Progress</h3>
              </div>
              <div className="completion-meter">
                <span style={{ width: `${stats.completionRate}%` }} />
              </div>
              <div className="meter-copy">
                <strong>{stats.completionRate}%</strong>
                <span>finished</span>
              </div>
              <div className="status-bars">
                {Object.entries(STATUSES).map(([key, status]) => (
                  <div className="status-bar-row" key={key}>
                    <span>{status.longLabel}</span>
                    <div>
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

            <ReadingStack title="Reading now" books={currentlyReading} empty="No active reads." />
            <ReadingStack title="Recently finished" books={recentlyFinished} empty="Nothing finished yet." />
          </aside>
        </section>
      </main>

      {modalOpen ? (
        <BookModal
          editing={Boolean(editingId)}
          form={form}
          onClose={closeModal}
          onFormChange={setForm}
          onSearch={searchOpenLibrary}
          onSubmit={submitBook}
          quickAdd={quickAdd}
          searchError={searchError}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searching={searching}
          setSearchQuery={setSearchQuery}
          useSearchResult={useSearchResult}
          books={books}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Cover({ book, className = "" }) {
  return (
    <div className={`cover ${className}`} style={getCoverStyle(`${book.title}${book.author}`)}>
      {book.coverUrl ? (
        <img src={book.coverUrl} alt="" loading="lazy" />
      ) : (
        <div className="cover-fallback" aria-hidden="true">
          <span>{getInitials(book.title)}</span>
          <i />
        </div>
      )}
    </div>
  );
}

function BookCard({ book, layout, onDelete, onEdit, onUpdate }) {
  const progress = progressFor(book);
  const StatusIcon = STATUSES[book.status].icon;
  const [pageDraft, setPageDraft] = useState(String(book.currentPage || 0));

  useEffect(() => {
    setPageDraft(String(book.currentPage || 0));
  }, [book.currentPage]);

  function commitPage() {
    onUpdate(book.id, { currentPage: pageDraft });
  }

  return (
    <article className={`book-card ${layout === "list" ? "row" : ""}`}>
      <Cover book={book} />
      <div className="book-main">
        <div className="book-title-row">
          <div className="book-heading">
            <div className="status-chip" style={{ "--status-color": STATUSES[book.status].color }}>
              <StatusIcon size={13} />
              <span>{STATUSES[book.status].longLabel}</span>
            </div>
            <h3>{book.title}</h3>
            <p>
              {book.author || "Unknown author"}
              {book.publishedYear ? `, ${book.publishedYear}` : ""}
            </p>
          </div>
          <div className="book-actions">
            <button
              className={book.favorite ? "icon-button active" : "icon-button"}
              onClick={() => onUpdate(book.id, { favorite: !book.favorite })}
              aria-label="Toggle favorite"
              title="Toggle favorite"
              type="button"
            >
              <Heart size={17} />
            </button>
            <button
              className="icon-button"
              onClick={() => onEdit(book)}
              aria-label="Edit book"
              title="Edit book"
              type="button"
            >
              <Edit3 size={17} />
            </button>
            <button
              className="icon-button danger"
              onClick={() => onDelete(book)}
              aria-label="Remove book"
              title="Remove book"
              type="button"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        <div className="rating-row">
          <Rating value={book.rating} onChange={(rating) => onUpdate(book.id, { rating })} />
          {book.finishedAt ? <span>Finished {formatDate(book.finishedAt)}</span> : null}
        </div>

        {book.tags.length ? (
          <div className="tag-row">
            {book.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        <div className="progress-area">
          <div className="progress-copy">
            <strong>{progress}%</strong>
            <span>
              {book.pages
                ? `${book.currentPage.toLocaleString()} of ${book.pages.toLocaleString()} pages`
                : "Page count not set"}
            </span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="card-controls">
          <div className="segmented status-segmented">
            {Object.entries(STATUSES).map(([key, status]) => {
              const Icon = status.icon;
              return (
                <button
                  className={book.status === key ? "active" : ""}
                  key={key}
                  onClick={() => onUpdate(book.id, { status: key })}
                  type="button"
                >
                  <Icon size={15} />
                  <span>{status.label}</span>
                </button>
              );
            })}
          </div>

          {book.pages ? (
            <label className="page-field">
              <input
                type="number"
                min="0"
                max={book.pages}
                value={pageDraft}
                onChange={(event) => setPageDraft(event.target.value)}
                onBlur={commitPage}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitPage();
                }}
              />
              <span>page</span>
            </label>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Rating({ value, onChange }) {
  return (
    <div className="rating" aria-label={`${value || 0} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const rating = index + 1;
        return (
          <button
            className={rating <= value ? "filled" : ""}
            key={rating}
            onClick={() => onChange(value === rating ? 0 : rating)}
            aria-label={`${rating} stars`}
            title={`${rating} stars`}
            type="button"
          >
            <Star size={16} />
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ hasBooks, onAdd, onReset }) {
  return (
    <div className="empty-state">
      <div className="empty-covers" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} style={getCoverStyle(`empty-state-${index}`)} />
        ))}
      </div>
      <h3>{hasBooks ? "No books match this view" : "Your ledger is empty"}</h3>
      <p>{hasBooks ? "Clear filters or search for another shelf entry." : "Add the first title to begin."}</p>
      <div className="empty-actions">
        <button className="button primary" onClick={onAdd} type="button">
          <Plus size={18} />
          <span>Add book</span>
        </button>
        {hasBooks ? (
          <button className="button ghost on-light" onClick={onReset} type="button">
            <RotateCcw size={17} />
            <span>Reset filters</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReadingStack({ title, books, empty }) {
  return (
    <div className="insight-block compact">
      <div className="panel-heading">
        <BookMarked size={18} />
        <h3>{title}</h3>
      </div>
      {books.length ? (
        <div className="stack-list">
          {books.map((book) => (
            <div className="stack-item" key={book.id}>
              <Cover book={book} className="tiny" />
              <div>
                <strong>{book.title}</strong>
                <span>{progressFor(book)}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}

function BookModal({
  books,
  editing,
  form,
  onClose,
  onFormChange,
  onSearch,
  onSubmit,
  quickAdd,
  searchError,
  searchQuery,
  searchResults,
  searching,
  setSearchQuery,
  useSearchResult,
}) {
  const existingKeys = useMemo(() => new Set(books.map((book) => book.sourceKey).filter(Boolean)), [books]);

  function patchForm(patch) {
    onFormChange((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="book-modal-title">
        <div className="modal-header">
          <div>
            <p className="section-kicker">{editing ? "Edit entry" : "New entry"}</p>
            <h2 id="book-modal-title">{editing ? "Update book" : "Add a book"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close" title="Close" type="button">
            <X size={19} />
          </button>
        </div>

        {!editing ? (
          <form className="lookup-bar" onSubmit={onSearch}>
            <label className="search-field">
              <Search size={18} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Find a book from Open Library"
              />
            </label>
            <button className="button primary" disabled={searching} type="submit">
              {searching ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
              <span>{searching ? "Searching" : "Search"}</span>
            </button>
          </form>
        ) : null}

        {searchError ? <div className="inline-alert">{searchError}</div> : null}

        {searchResults.length ? (
          <div className="search-results">
            {searchResults.map((doc) => {
              const alreadyAdded = existingKeys.has(doc.key);
              const tempBook = normalizeBook({
                ...formFromDoc(doc),
                pages: doc.number_of_pages_median || 0,
              });
              return (
                <div className="result-row" key={doc.key}>
                  <Cover book={tempBook} className="tiny" />
                  <div>
                    <strong>{doc.title}</strong>
                    <span>
                      {doc.author_name?.[0] || "Unknown author"}
                      {doc.first_publish_year ? `, ${doc.first_publish_year}` : ""}
                    </span>
                  </div>
                  <button className="button ghost on-light" onClick={() => useSearchResult(doc)} type="button">
                    <Import size={16} />
                    <span>Use</span>
                  </button>
                  <button
                    className="button primary compact"
                    disabled={alreadyAdded}
                    onClick={() => quickAdd(doc)}
                    type="button"
                  >
                    <Plus size={16} />
                    <span>{alreadyAdded ? "Added" : "Add"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <form className="book-form" onSubmit={onSubmit}>
          <div className="form-cover">
            <Cover
              book={normalizeBook({
                title: form.title || "New book",
                author: form.author,
                coverUrl: form.coverUrl,
                coverId: form.coverId,
              })}
            />
          </div>

          <div className="form-grid">
            <label className="field span-2">
              <span>Title</span>
              <input
                required
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Author</span>
              <input value={form.author} onChange={(event) => patchForm({ author: event.target.value })} />
            </label>
            <label className="field">
              <span>Published</span>
              <input
                inputMode="numeric"
                value={form.publishedYear}
                onChange={(event) => patchForm({ publishedYear: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Pages</span>
              <input
                min="0"
                type="number"
                value={form.pages}
                onChange={(event) => patchForm({ pages: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Current page</span>
              <input
                min="0"
                type="number"
                value={form.currentPage}
                onChange={(event) => patchForm({ currentPage: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => patchForm({ status: event.target.value })}>
                {Object.entries(STATUSES).map(([key, status]) => (
                  <option key={key} value={key}>
                    {status.longLabel}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Rating</span>
              <div className="rating-input">
                <Rating value={form.rating} onChange={(rating) => patchForm({ rating })} />
              </div>
            </label>
            <label className="field span-2">
              <span>Tags</span>
              <div className="field-with-icon">
                <Tags size={17} />
                <input
                  value={form.tags}
                  onChange={(event) => patchForm({ tags: event.target.value })}
                  placeholder="fiction, craft, research"
                />
              </div>
            </label>
            <label className="field span-2">
              <span>Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => patchForm({ notes: event.target.value })}
                rows={4}
              />
            </label>
          </div>

          <div className="modal-footer">
            <button className="button ghost on-light" onClick={onClose} type="button">
              <X size={17} />
              <span>Cancel</span>
            </button>
            <button className="button primary" type="submit">
              <Sparkles size={18} />
              <span>{editing ? "Save changes" : "Save book"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default App;
