import React, { useMemo, useState } from "react";
import { Check } from "lucide-react";
import BookCover from "../../shared/pk/BookCover";
import Button from "../../shared/pk/Button";
import Dialog from "../../shared/pk/Dialog";
import Field from "../../shared/pk/Field";
import SearchBox from "../../shared/pk/SearchBox";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { langOf } from "../../shared/lib/script";
import { matchesQuery } from "../../domain/library";
import { useBooks, useShelves } from "../../app/AppContext";

/**
 * Builds a shelf in one go: name it (for a new shelf) and tick books from the
 * library. With `shelfName` it adds books to that existing shelf instead.
 * `onSaved(name)` runs after a successful save.
 */
function ShelfBuilder({ shelfName, onClose, onSaved }) {
  const { t } = useLanguage();
  const { books } = useBooks();
  const { uniqueShelves, addToShelf } = useShelves();
  const [name, setName] = useState(shelfName || "");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const isNew = !shelfName;

  const candidates = useMemo(
    () => books.filter((book) => !(shelfName && (book.shelves || []).includes(shelfName))).filter((book) => matchesQuery(book, query)),
    [books, shelfName, query]
  );
  const trimmed = name.trim();
  const clash = isNew && uniqueShelves.includes(trimmed);

  const toggle = (id) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    if (!trimmed || !picked.size || clash) return;
    setBusy(true);
    const saved = await addToShelf(trimmed, [...picked]);
    setBusy(false);
    if (saved) {
      onSaved?.(trimmed);
      onClose();
    }
  };

  return (
    <Dialog
      size="md"
      title={isNew ? t("shelfBuilder.newTitle") : t("shelfBuilder.addTitle", { name: shelfName })}
      closeLabel={t("action.close")}
      onClose={onClose}
      footer={
        <>
          <span className="pk-builder__picked">{t("shelfBuilder.picked", { count: picked.size })}</span>
          <Button variant="ghost" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" type="submit" form="shelf-builder" loading={busy} disabled={!trimmed || !picked.size || clash}>
            {isNew ? t("shelfBuilder.create") : t("shelfBuilder.add")}
          </Button>
        </>
      }
    >
      <form id="shelf-builder" className="pk-builder" onSubmit={submit}>
        {isNew && (
          <Field
            label={t("shelf.nameLabel")}
            value={name}
            placeholder={t("shelfBuilder.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            error={clash ? t("shelfBuilder.exists") : undefined}
            required
            data-autofocus
          />
        )}
        <SearchBox
          value={query}
          onChange={setQuery}
          label={t("shelfBuilder.search")}
          placeholder={t("shelfBuilder.search")}
          clearLabel={t("action.close")}
        />
        {candidates.length ? (
          <ul className="pk-builder__list" aria-label={t("shelfBuilder.books")}>
            {candidates.map((book) => {
              const on = picked.has(book.id);
              return (
                <li key={book.id}>
                  <label className={on ? "pk-builder__item pk-builder__item--on" : "pk-builder__item"}>
                    <input type="checkbox" checked={on} onChange={() => toggle(book.id)} />
                    <BookCover book={book} size="sm" />
                    <span className="pk-builder__text">
                      <span className="pk-builder__title" lang={langOf(book.title)}>
                        {book.title}
                      </span>
                      <span className="pk-builder__author" lang={langOf(book.author || "")}>
                        {book.author || t("book.unknownAuthor")}
                      </span>
                    </span>
                    <span className="pk-builder__check" aria-hidden="true">
                      <Check size={14} />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pk-builder__empty">{t("shelfBuilder.none")}</p>
        )}
      </form>
    </Dialog>
  );
}

export default ShelfBuilder;
