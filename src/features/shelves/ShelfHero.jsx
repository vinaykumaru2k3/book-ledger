import React, { useState } from "react";
import { Plus } from "lucide-react";
import BookSpine from "../../shared/pk/BookSpine";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useShelves } from "../../app/AppContext";
import ShelfActions from "./ShelfActions";
import ShelfBuilder from "./ShelfBuilder";
import { shelfStats } from "./shelfStats";

/**
 * The top of a shelf's page: a band in the shelf's colour with its books on a
 * plank, the shelf at a glance, "Add books" and the rename / delete menu.
 */
function ShelfHero({ name, onRenamed, onDeleted }) {
  const { t } = useLanguage();
  const { shelfBooks, getPreset } = useShelves();
  const [adding, setAdding] = useState(false);
  const books = shelfBooks[name] || [];
  const stats = shelfStats(books);

  const figures = [
    { value: stats.total, label: stats.total === 1 ? t("shelfHero.book") : t("shelfHero.books") },
    { value: `${stats.readShare}%`, label: t("shelfHero.read") },
    { value: stats.pages.toLocaleString(), label: t("shelfHero.pages") },
    { value: stats.scripts, label: stats.scripts === 1 ? t("shelfHero.script") : t("shelfHero.scripts") },
  ];

  return (
    <section className="pk-shelfhero" style={{ "--shelf-accent": getPreset(name).color }} aria-label={t("shelfHero.label", { name })}>
      <div className="pk-shelfhero__top">
        <dl className="pk-shelfhero__figures">
          {figures.map(({ value, label }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="pk-shelfhero__actions">
          <button type="button" className="pk-shelfhero__add" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            {t("shelfBuilder.addBooks")}
          </button>
          <ShelfActions name={name} onRenamed={onRenamed} onDeleted={onDeleted} />
        </div>
      </div>

      <div className="pk-shelfhero__shelf" aria-hidden="true">
        <div className="pk-shelfhero__books">
          {books.slice(0, 24).map((book) => (
            <BookSpine key={book.id} book={book} scale={0.86} />
          ))}
        </div>
        <div className="pk-shelfhero__plank" />
      </div>

      {adding && <ShelfBuilder shelfName={name} onClose={() => setAdding(false)} />}
    </section>
  );
}

export default ShelfHero;
