import React from "react";
import { FolderOpen } from "lucide-react";
import EmptyState from "../../shared/pk/EmptyState";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { shelfPath, shelfRoute } from "../../domain/library";
import { useShelves } from "../../app/AppContext";
import BookSpine from "../library/BookSpine";

const PREVIEW_LIMIT = 8;

/**
 * One shelf as a card: a miniature wooden shelf with its books standing on it.
 * It is a real link to the shelf's library view (`/shelf%3A<name>`), so
 * middle-click and "open in new tab" work.
 */
function ShelfCard({ name, books, color, onOpen }) {
  const { t } = useLanguage();
  const count = books.length === 1 ? t("shelf.countOne") : t("shelf.count", { count: books.length });

  return (
    <a
      className="pk-shelfcard"
      href={shelfPath(name)}
      style={{ "--shelf-accent": color }}
      aria-label={`${t("shelves.openShelf", { name })} (${count})`}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onOpen(shelfRoute(name));
      }}
    >
      <div className="pk-shelfcard__scene" aria-hidden="true">
        {books.slice(0, PREVIEW_LIMIT).map((book) => (
          <BookSpine key={book.id} book={book} scale={0.62} />
        ))}
      </div>
      <div className="pk-shelfcard__plank" aria-hidden="true" />
      <div className="pk-shelfcard__info">
        <h2 className="pk-shelfcard__name">{name}</h2>
        <span className="pk-shelfcard__count">{count}</span>
      </div>
    </a>
  );
}

/** All of your shelves. A shelf is just a name on books, so these come from the books themselves. */
function ShelvesDashboard({ navigate }) {
  const { t } = useLanguage();
  const { uniqueShelves, shelfBooks, getPreset } = useShelves();

  if (uniqueShelves.length === 0) {
    return (
      <EmptyState icon={FolderOpen} title={t("shelves.emptyTitle")}>
        {t("shelves.emptyBody")}
      </EmptyState>
    );
  }

  return (
    <section aria-label={t("nav.shelves")}>
      <p className="pk-shelves-intro">{t("shelves.intro")}</p>
      <div className="pk-shelfgrid">
        {uniqueShelves.map((name) => (
          <ShelfCard key={name} name={name} books={shelfBooks[name] || []} color={getPreset(name).color} onOpen={navigate} />
        ))}
      </div>
    </section>
  );
}

export default ShelvesDashboard;
