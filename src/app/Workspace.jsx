import React, { Suspense, useMemo } from "react";
import LoadingPanel from "../shared/ui/LoadingPanel";
import Toast from "../shared/ui/Toast";
import BookFormModal from "../features/library/book-form/BookFormModal";
import BookDetailsModal from "../features/library/BookDetailsModal";
import DeleteConfirmModal from "../features/library/DeleteConfirmModal";
import LibraryPage from "../features/library/LibraryPage";
import { computeLibraryStats } from "../domain/library";
import { useApp, useBooks, useModal, useToast } from "./AppContext";
import PageHeader from "./PageHeader";
import Sidebar from "./Sidebar";
import { describeRoute } from "./views";
import { usePathRoute } from "./usePathRoute";

/** The signed-in app: sidebar + the page for the current route + global dialogs. */
function Workspace() {
  const [route, navigate] = usePathRoute("all");
  const { books } = useBooks();
  const modal = useModal();
  const { toast, toastType } = useToast();
  const { deleteConfirmBook, detailsBook } = useApp();

  const stats = useMemo(() => computeLibraryStats(books), [books]);
  const { page, kicker, title, isLibrary } = describeRoute(route);

  return (
    <div className="app-shell">
      <Sidebar route={route} stats={stats} onNavigate={navigate} />

      <main className="workspace">
        <PageHeader kicker={kicker} title={title} stats={stats} showStats={isLibrary} />

        <Suspense fallback={<LoadingPanel label="Loading view..." />}>
          {page ? (
            <div
              className="library-panel recommendations-panel-wrapper"
              style={page.fullBleed ? { padding: 0, overflow: "hidden" } : undefined}
            >
              <page.Component />
            </div>
          ) : (
            <LibraryPage view={route} stats={stats} onClearView={() => navigate("all")} />
          )}
        </Suspense>
      </main>

      {modal.open && <BookFormModal />}
      {toast && <Toast message={toast} type={toastType} />}
      {deleteConfirmBook && <DeleteConfirmModal />}
      {detailsBook && <BookDetailsModal />}
    </div>
  );
}

export default Workspace;
