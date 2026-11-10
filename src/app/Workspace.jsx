import React, { Suspense, useCallback, useMemo, useState } from "react";
import LoadingPanel from "../shared/ui/LoadingPanel";
import Toast from "../shared/ui/Toast";
import { useLanguage } from "../shared/i18n/LanguageContext";
import BookFormModal from "../features/library/book-form/BookFormModal";
import BookDetailsModal from "../features/library/BookDetailsModal";
import DeleteConfirmModal from "../features/library/DeleteConfirmModal";
import LibraryPage from "../features/library/LibraryPage";
import LibraryTabs from "../features/library/LibraryTabs";
import ShelfActions from "../features/shelves/ShelfActions";
import { computeLibraryStats, shelfFromRoute, shelfRoute } from "../domain/library";
import { useApp, useBooks, useModal, useToast, useUi } from "./AppContext";
import PageHeader from "./PageHeader";
import VerifyBanner from "./shell/VerifyBanner";
import { buildPath } from "./routes";
import { describeRoute } from "./views";
import CommandPalette from "./shell/CommandPalette";
import NavRail from "./shell/NavRail";
import TabBar from "./shell/TabBar";
import { useCommandHotkey } from "./shell/useCommandHotkey";

/**
 * The signed-in app: navigation (rail on desktop, tab bar on phones), the page
 * for the current route, the command palette and the global dialogs.
 * `view`, `navigate` and `location` come from `usePathRoute` in the app gate.
 */
function Workspace({ view, navigate, location }) {
  const { t } = useLanguage();
  const { books } = useBooks();
  const modal = useModal();
  const { openNewBook, openDetails } = useUi();
  const { toast, toastType } = useToast();
  const { deleteConfirmBook, detailsBook } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const stats = useMemo(() => computeLibraryStats(books), [books]);
  const { page, kickerKey, titleKey, titleVars, isLibrary } = describeRoute(view);
  const shelfName = shelfFromRoute(view);
  const anyDialogOpen = modal.open || Boolean(detailsBook) || Boolean(deleteConfirmBook);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandHotkey(openPalette, !paletteOpen && !anyDialogOpen);

  const runCommand = (action) => {
    if (action.type === "navigate") navigate(action.view);
    else if (action.type === "book") openDetails(action.book);
    else if (action.type === "addBook") openNewBook();
  };

  return (
    <div className="pk-shell">
      <a className="pk-skip" href="#main">
        {t("nav.skipToContent")}
      </a>

      <NavRail view={view} onNavigate={navigate} />

      <div className="pk-shell__body">
        <VerifyBanner />
        <PageHeader
          kicker={t(kickerKey)}
          title={t(titleKey, titleVars)}
          stats={stats}
          showStats={isLibrary}
          onOpenCommand={openPalette}
          onAdd={openNewBook}
          onNavigate={navigate}
          back={shelfName !== null ? { view: "shelves", label: t("shelves.back") } : undefined}
          extra={
            shelfName !== null && (
              <ShelfActions name={shelfName} onRenamed={(next) => navigate(shelfRoute(next))} onDeleted={() => navigate("shelves")} />
            )
          }
        />

        {isLibrary && shelfName === null && <LibraryTabs view={view} stats={stats} onChange={navigate} />}

        {/* Keyed by view so the entrance animation replays on every navigation. */}
        <main id="main" className="pk-page" key={view} tabIndex={-1}>
          <Suspense fallback={<LoadingPanel label="Loading view..." />}>
            {page ? (
              page.bare ? (
                <page.Component params={location.params} path={buildPath(view, location.params)} navigate={navigate} />
              ) : (
                <div
                  className="library-panel recommendations-panel-wrapper"
                  style={page.fullBleed ? { padding: 0, overflow: "hidden" } : undefined}
                >
                  <page.Component navigate={navigate} />
                </div>
              )
            ) : (
              <LibraryPage view={view} stats={stats} onClearView={() => navigate("all")} />
            )}
          </Suspense>
        </main>
      </div>

      <TabBar view={view} onNavigate={navigate} onAdd={openNewBook} />

      {paletteOpen && <CommandPalette books={books} onRun={runCommand} onClose={() => setPaletteOpen(false)} />}
      {modal.open && <BookFormModal />}
      {toast && <Toast message={toast} type={toastType} />}
      {deleteConfirmBook && <DeleteConfirmModal />}
      {detailsBook && <BookDetailsModal />}
    </div>
  );
}

export default Workspace;
