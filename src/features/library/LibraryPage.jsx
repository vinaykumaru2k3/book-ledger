import React from "react";
import { Library, Plus, RotateCcw, SearchX } from "lucide-react";
import Button from "../../shared/pk/Button";
import EmptyState from "../../shared/pk/EmptyState";
import Pagination from "../../shared/pk/Pagination";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useBooks, useUi } from "../../app/AppContext";
import BookList from "./BookList";
import LibrarySidePanel from "./LibrarySidePanel";
import LibrarySkeleton from "./LibrarySkeleton";
import LibraryToolbar from "./LibraryToolbar";
import { useLibraryView } from "./useLibraryView";

/**
 * The main library screen: toolbar, the paged books for the current view in
 * the chosen layout, and (on filtered views) the progress side panel. The
 * "all" view has the dashboard above it instead.
 */
function LibraryPage({ view, stats, onClearView }) {
  const { t } = useLanguage();
  const { books, booksLoading } = useBooks();
  const { openNewBook } = useUi();
  const lib = useLibraryView(books, view);
  const { pageData } = lib;

  const clearFilters = () => {
    onClearView();
    lib.resetFilters();
  };

  const hasBooks = books.length > 0;

  return (
    <div className={view === "all" ? "pk-lib pk-lib--wide" : "pk-lib"}>
      <section className="pk-lib__main" aria-label={t("nav.library")}>
        <LibraryToolbar lib={lib} />

        {booksLoading ? (
          <LibrarySkeleton />
        ) : lib.visible.length ? (
          <>
            <BookList books={pageData.items} layout={lib.layout} />
            <Pagination
              page={pageData.page}
              pageCount={pageData.pageCount}
              start={pageData.start}
              pageSize={lib.pageSize}
              total={pageData.total}
              onChange={lib.setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={hasBooks ? SearchX : Library}
            title={hasBooks ? t("empty.noMatchTitle") : t("empty.emptyTitle")}
            action={
              <div className="pk-empty__actions">
                <Button variant="primary" icon={Plus} onClick={openNewBook}>
                  {t("action.addBook")}
                </Button>
                {hasBooks && (
                  <Button icon={RotateCcw} onClick={clearFilters}>
                    {t("empty.reset")}
                  </Button>
                )}
              </div>
            }
          >
            {hasBooks ? t("empty.noMatchBody") : t("empty.emptyBody")}
          </EmptyState>
        )}
      </section>

      {view !== "all" && <LibrarySidePanel books={books} stats={stats} />}
    </div>
  );
}

export default LibraryPage;
