import React from "react";
import { Grid3X3, List } from "lucide-react";
import SearchField from "../../shared/ui/SearchField";
import SelectField from "../../shared/ui/SelectField";
import Pagination from "../../shared/ui/Pagination";
import LoadingPanel from "../../shared/ui/LoadingPanel";
import { SORT_OPTIONS } from "../../domain/library";
import { useBooks, useUi } from "../../app/AppContext";
import BookCard from "./BookCard";
import EmptyState from "./EmptyState";
import LibrarySidePanel from "./LibrarySidePanel";
import { BOOKS_PER_PAGE, useLibraryView } from "./useLibraryView";

const LAYOUTS = [
  { value: "grid", label: "Grid", icon: Grid3X3, size: 15 },
  { value: "list", label: "List", icon: List, size: 16 },
];

/**
 * The main library screen: toolbar (search / sort / layout), the paged list of
 * books for the current view, and the progress side panel.
 */
function LibraryPage({ view, stats, onClearView }) {
  const { books, booksLoading } = useBooks();
  const { openNewBook } = useUi();
  const lib = useLibraryView(books, view);
  const { pageData } = lib;

  const clearFilters = () => {
    onClearView();
    lib.resetFilters();
  };

  return (
    <section className="content-layout">
      <div className="library-panel">
        <div className="toolbar">
          <SearchField
            value={lib.query}
            onChange={lib.setQuery}
            label="Filter library"
            placeholder="Filter by title, author, tags, notes..."
          />

          <SelectField
            className="library-sort-select"
            label="Sort books"
            value={lib.sortBy}
            onChange={lib.setSortBy}
            options={SORT_OPTIONS}
          />

          <div className="view-toggle" aria-label="Toggle Layout Grid/List">
            {LAYOUTS.map(({ value, label, icon: Icon, size }) => (
              <button
                key={value}
                className={lib.layout === value ? "active" : ""}
                onClick={() => lib.setLayout(value)}
                aria-label={`${label} View`}
                title={`${label} Layout`}
                type="button"
              >
                <Icon size={size} />
              </button>
            ))}
          </div>
        </div>

        {booksLoading ? (
          <LoadingPanel label="Connecting with Database ledger..." />
        ) : lib.visible.length ? (
          <>
            <div className={lib.layout === "grid" ? "book-grid" : "book-list"}>
              {pageData.items.map((book) => (
                <BookCard key={book.id} book={book} layout={lib.layout} />
              ))}
            </div>
            <Pagination
              page={pageData.page}
              pageCount={pageData.pageCount}
              start={pageData.start}
              pageSize={BOOKS_PER_PAGE}
              total={pageData.total}
              onChange={lib.setPage}
            />
          </>
        ) : (
          <EmptyState hasBooks={books.length > 0} onAdd={openNewBook} onReset={clearFilters} />
        )}
      </div>

      <LibrarySidePanel books={books} stats={stats} />
    </section>
  );
}

export default LibraryPage;
