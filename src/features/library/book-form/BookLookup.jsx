import React, { useEffect, useState } from "react";
import { Import, Loader2, Plus } from "lucide-react";
import BookCover from "../../../shared/pk/BookCover";
import Button from "../../../shared/pk/Button";
import SearchBox from "../../../shared/pk/SearchBox";
import SelectBox from "../../../shared/pk/SelectBox";
import { findDuplicate } from "../../../domain/library";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useBookSearch } from "./useBookSearch";

const TYPES = ["all", "title", "author", "genre"];

function ResultRow({ volume, alreadyAdded, onFill, onQuickAdd }) {
  const { t } = useLanguage();
  const info = volume.volumeInfo || {};
  const authors = info.authors?.join(", ") || "";
  const snippet = info.description ? info.description.replace(/<[^>]*>/g, "").slice(0, 110) : "";
  const thumbnail = (info.imageLinks?.smallThumbnail || info.imageLinks?.thumbnail || "").replace(/^http:\/\//, "https://");
  const preview = { title: info.title || "Untitled", author: authors, coverUrl: thumbnail };

  return (
    <li className="pk-result">
      <BookCover book={preview} size="sm" />
      <div className="pk-result__text">
        <strong>{info.title}</strong>
        <span>
          {authors || t("book.unknownAuthor")}
          {info.publishedDate ? ` • ${info.publishedDate.split("-")[0]}` : ""}
          {info.pageCount ? ` • ${t("book.pages", { count: info.pageCount })}` : ""}
        </span>
        {snippet && <span className="pk-result__snippet">{snippet}…</span>}
        {info.categories?.length > 0 && (
          <span className="pk-result__chips">
            {info.categories.slice(0, 3).map((category) => (
              <span key={category}>{category}</span>
            ))}
          </span>
        )}
      </div>
      <div className="pk-result__actions">
        <Button size="sm" icon={Import} onClick={() => onFill(volume)}>
          {t("lookup.fill")}
        </Button>
        <Button size="sm" variant="primary" icon={Plus} disabled={alreadyAdded} onClick={() => onQuickAdd(volume)}>
          {alreadyAdded ? t("lookup.added") : t("lookup.quickAdd")}
        </Button>
      </div>
    </li>
  );
}

/**
 * Search the book catalogues (Google Books, then Open Library) and either fill
 * the form from a result or add it straight away. Results sit inline above the
 * form; after "Fill form" they fold away so the form is in view.
 */
function BookLookup({ books, onFill, onQuickAdd }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [folded, setFolded] = useState(false);
  const { results, searching, problem } = useBookSearch(query, type);

  // A new search or a new query brings the results back.
  useEffect(() => setFolded(false), [query, type]);

  const status = searching
    ? t("lookup.searching")
    : problem
      ? t(`lookup.${problem}`)
      : results.length && !folded
        ? t("lookup.count", { count: results.length })
        : "";

  const fill = async (volume) => {
    await onFill(volume);
    setFolded(true);
  };

  return (
    <section className="pk-lookup" aria-label={t("lookup.region")}>
      <div className="pk-lookup__bar">
        <SearchBox
          className="pk-lookup__search"
          value={query}
          onChange={setQuery}
          label={t("lookup.label")}
          placeholder={t("lookup.placeholder")}
          clearLabel={t("action.close")}
          data-autofocus
        />
        <SelectBox
          value={type}
          onChange={setType}
          label={t("lookup.typeLabel")}
          options={TYPES.map((value) => ({ value, label: t(`lookup.type.${value}`) }))}
        />
      </div>

      <p className="pk-lookup__status" role="status" aria-live="polite">
        {searching && <Loader2 size={14} className="pk-spin" aria-hidden="true" />}
        {status || (!query.trim() ? t("lookup.hint") : "")}
      </p>

      {results.length > 0 && !folded && (
        <ul className="pk-lookup__results">
          {results.map((volume) => {
            const info = volume.volumeInfo || {};
            const alreadyAdded = Boolean(
              findDuplicate(books, { sourceKey: volume.id, title: info.title, author: info.authors?.join(", ") })
            );
            return <ResultRow key={volume.id} volume={volume} alreadyAdded={alreadyAdded} onFill={fill} onQuickAdd={onQuickAdd} />;
          })}
        </ul>
      )}
    </section>
  );
}

export default BookLookup;
