import React, { useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import Button from "../../shared/pk/Button";
import EmptyState from "../../shared/pk/EmptyState";
import BookSpine from "../../shared/pk/BookSpine";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { langOf } from "../../shared/lib/script";
import { shelfPath, shelfRoute } from "../../domain/library";
import { useBooks, useShelves } from "../../app/AppContext";
import ShelfBuilder from "./ShelfBuilder";
import { shelfStats, unshelvedBooks } from "./shelfStats";

const ROW_LIMIT = 16;

/**
 * One shelf as a row of the bookcase: an engraved brass nameplate and the
 * books standing on a plank. The whole row is a real link to the shelf's
 * page (`/shelf%3A<name>`), so middle-click and "open in new tab" work.
 */
function ShelfRow({ name, books, color, onOpen, index }) {
  const { t } = useLanguage();
  const stats = shelfStats(books);
  const count = books.length === 1 ? t("shelf.countOne") : t("shelf.count", { count: books.length });
  const extra = books.length - ROW_LIMIT;

  return (
    <a
      className="pk-case__row"
      href={shelfPath(name)}
      style={{ "--shelf-accent": color, "--i": index }}
      aria-label={`${t("shelves.openShelf", { name })} (${count})`}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onOpen(shelfRoute(name));
      }}
    >
      <span className="pk-case__plate" aria-hidden="true">
        <span className="pk-case__name" lang={langOf(name)}>
          {name}
        </span>
        <span className="pk-case__meta">{count}</span>
        <span className="pk-case__read">
          <span className="pk-case__readBar">
            <i style={{ width: `${stats.readShare}%` }} />
          </span>
          {t("shelves.readShare", { pct: stats.readShare })}
        </span>
      </span>
      <span className="pk-case__books" aria-hidden="true">
        {books.slice(0, ROW_LIMIT).map((book) => (
          <BookSpine key={book.id} book={book} scale={0.78} />
        ))}
        {extra > 0 && (
          <span className="pk-case__more">
            <span className="pk-case__moreStack" />
            {t("shelves.more", { count: extra })}
          </span>
        )}
        <span className="pk-case__bookend" />
      </span>
    </a>
  );
}

/**
 * All your shelves as one walnut bookcase, with a summary line and the
 * shelf builder ("New shelf"). A shelf is just a name on books, so the rows
 * come from the books themselves.
 */
function ShelvesDashboard({ navigate }) {
  const { t } = useLanguage();
  const { books } = useBooks();
  const { uniqueShelves, shelfBooks, getPreset } = useShelves();
  const [building, setBuilding] = useState(false);
  const shelvedCount = useMemo(() => books.length - unshelvedBooks(books).length, [books]);
  const loose = books.length - shelvedCount;

  const builder = building && <ShelfBuilder onClose={() => setBuilding(false)} onSaved={(name) => navigate(shelfRoute(name))} />;
  // Next to the header's solid "Add Book" this is secondary; as the only action on an empty page it is primary.
  const newShelf = (variant) => (
    <Button variant={variant} icon={Plus} onClick={() => setBuilding(true)}>
      {t("shelfBuilder.new")}
    </Button>
  );

  if (uniqueShelves.length === 0) {
    return (
      <>
        <EmptyState icon={FolderOpen} title={t("shelves.emptyTitle")} action={books.length ? newShelf("primary") : null}>
          {t("shelves.emptyBody")}
        </EmptyState>
        {builder}
      </>
    );
  }

  return (
    <section className="pk-shelves" aria-label={t("nav.shelves")}>
      <div className="pk-shelves__bar">
        <p className="pk-shelves__summary">
          <strong>{uniqueShelves.length}</strong> {uniqueShelves.length === 1 ? t("shelves.shelfOne") : t("shelves.shelves")}
          <span aria-hidden="true">·</span>
          <strong>{shelvedCount}</strong> {t("shelves.shelved")}
          {loose > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="pk-shelves__loose">{t("shelves.loose", { count: loose })}</span>
            </>
          )}
        </p>
        {newShelf("secondary")}
      </div>

      <div className="pk-case">
        <div className="pk-case__crown" aria-hidden="true" />
        {uniqueShelves.map((name, index) => (
          <ShelfRow key={name} name={name} books={shelfBooks[name] || []} color={getPreset(name).color} onOpen={navigate} index={index} />
        ))}
        <div className="pk-case__base" aria-hidden="true" />
      </div>
      {builder}
    </section>
  );
}

export default ShelvesDashboard;
