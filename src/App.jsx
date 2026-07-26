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
  Sparkles,
  Trophy,
  Layers,
  FolderOpen,
} from "lucide-react";

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
import Recommendations from "./components/Recommendations";
import TopCharts from "./components/TopCharts";
import Analytics from "./components/Analytics";
import ShelvesDashboard from "./components/ShelvesDashboard";

// Constants & context
import { STATUSES, SORTS, progressFor } from "./components/constants";
import { AppProvider, useAuth, useBooks, useShelves, useTheme, useUi, useModal, useToast, useApp } from "./context/AppContext";

function AppShell() {
  const auth = useAuth();
  const { books, booksLoading, exportLedger, importLedger } = useBooks();
  const fileInputRef = useRef(null);
  const { uniqueShelves } = useShelves();
  const { theme, toggleTheme } = useTheme();
  const { openNewBook, openDetails } = useUi();
  const modal = useModal();
  const { toast, toastType } = useToast();
  const { deleteConfirmBook, detailsBook } = useApp();

  const [statusFilter, setStatusFilter] = useState("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [view, setView] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [libraryQuery, statusFilter, sortBy]);

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
    if (
      statusFilter === "recommendations" ||
      statusFilter === "topbooks" ||
      statusFilter === "analytics" ||
      statusFilter === "shelves"
    )
      return [];
    const queryStr = libraryQuery.trim().toLowerCase();
    const filtered = books.filter((book) => {
      if (statusFilter === "favorites") {
        if (!book.favorite) return false;
      } else if (statusFilter.startsWith("shelf:")) {
        const shelfName = statusFilter.substring(6);
        if (!book.shelves || !book.shelves.includes(shelfName)) return false;
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

  function clearFilters() {
    setStatusFilter("all");
    setLibraryQuery("");
    setSortBy("recent");
  }

  if (!auth.authReady) {
    return <LoadingScreen label="Connecting with Database Ledger" />;
  }

  if (!auth.user && showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (!auth.user) {
    return (
      <AuthScreen
        error={auth.authError}
        onEmailSubmit={auth.signInWithEmail}
        onGoogleSignIn={auth.signInWithGoogle}
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

        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <div className="sidebar-section-label">Shelves</div>
          <nav className="status-nav" aria-label="Custom Shelves navigation">
            {uniqueShelves.length > 0 ? (
              <button
                className={statusFilter === "shelves" ? "nav-item active" : "nav-item"}
                onClick={() => setStatusFilter("shelves")}
                type="button"
              >
                <FolderOpen size={15} />
                <span>All Shelves</span>
              </button>
            ) : (
              <div className="sidebar-help-box">
                <FolderOpen size={13} />
                <span>Create shelves by editing any book and checking a shelf.</span>
              </div>
            )}
          </nav>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <div className="sidebar-section-label">Discover</div>
          <nav className="status-nav" aria-label="Discover navigation">
            <button
              className={statusFilter === "recommendations" ? "nav-item active" : "nav-item"}
              onClick={() => setStatusFilter("recommendations")}
              type="button"
            >
              <Sparkles size={17} />
              <span>Recommendations</span>
            </button>
            <button
              className={statusFilter === "topbooks" ? "nav-item active" : "nav-item"}
              onClick={() => setStatusFilter("topbooks")}
              type="button"
            >
              <Trophy size={17} />
              <span>Top Books</span>
            </button>
            <button
              className={statusFilter === "analytics" ? "nav-item active" : "nav-item"}
              onClick={() => setStatusFilter("analytics")}
              type="button"
            >
              <BarChart3 size={17} />
              <span>Insights</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-actions">
          <AccountCard user={auth.user} onSignOut={auth.signOut} />
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
              <p className="section-kicker">
                {statusFilter === "recommendations"
                  ? "Personalized Discovery"
                  : statusFilter === "topbooks"
                  ? "Popular Charts"
                  : statusFilter === "analytics"
                  ? "Reading Insights"
                  : "Library Dashboard"}
              </p>
              <h2 className="dashboard-title">
                {statusFilter === "recommendations"
                  ? "Book Recommendations"
                  : statusFilter === "topbooks"
                  ? "Discover Top Books"
                  : statusFilter === "analytics"
                  ? "Library Analytics"
                  : statusFilter === "shelves"
                  ? "Custom Shelves"
                  : statusFilter.startsWith("shelf:")
                  ? `Shelf: ${statusFilter.substring(6)}`
                  : "My Library"}
              </h2>
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

          {statusFilter !== "recommendations" &&
            statusFilter !== "topbooks" &&
            statusFilter !== "analytics" &&
            statusFilter !== "shelves" && (
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
            )}
        </header>

        {statusFilter === "recommendations" ? (
          <div className="library-panel recommendations-panel-wrapper">
            <Recommendations books={books} quickAdd={modal.quickAdd} onViewDetails={openDetails} />
          </div>
        ) : statusFilter === "topbooks" ? (
          <div className="library-panel recommendations-panel-wrapper">
            <TopCharts books={books} quickAdd={modal.quickAdd} onViewDetails={openDetails} />
          </div>
        ) : statusFilter === "analytics" ? (
          <div className="library-panel recommendations-panel-wrapper">
            <Analytics books={books} />
          </div>
        ) : statusFilter === "shelves" ? (
          <div className="library-panel recommendations-panel-wrapper">
            <ShelvesDashboard />
          </div>
        ) : (
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
                      <BookCard key={book.id} book={book} layout={view} />
                    ))}
                  </div>

                  {/* Folio Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="pagination-wrapper">
                      <div className="pagination-info">
                        Showing <strong>{startIndex + 1}</strong>–
                        <strong>{Math.min(startIndex + BOOKS_PER_PAGE, visibleBooks.length)}</strong> of{" "}
                        <strong>{visibleBooks.length}</strong> books
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
        )}
      </main>

      {modal.open && <BookModal />}
      {toast && <Toast message={toast} type={toastType} />}
      {deleteConfirmBook && <DeleteConfirmModal />}
      {detailsBook && <BookDetailsModal />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
