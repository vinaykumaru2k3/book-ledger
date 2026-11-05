import React, { useEffect, useRef, useState } from "react";
import { Edit3, Heart } from "lucide-react";
import Button from "../../../shared/pk/Button";
import Field from "../../../shared/pk/Field";
import ProgressRibbon from "../../../shared/pk/ProgressRibbon";
import RatingStars from "../../../shared/pk/RatingStars";
import { STATUSES, progressFor } from "../../../domain/status";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useBooks } from "../../../app/AppContext";

const toPage = (value) => Math.max(0, Number.parseInt(value, 10) || 0);
const storedValue = (book, field) => (field === "pages" ? (book.pages ? String(book.pages) : "") : String(book.currentPage || 0));

/**
 * Inline editing of a library book: status, pages read, rating and favourite.
 * Each change is saved straight away through `updateBook`, which also keeps
 * status and progress consistent (finishing the last page marks it finished).
 *
 * The page fields work from a *draft*: while you type, the field shows what you
 * typed; once saved (on blur / Enter, or when the dialog closes) the draft is
 * dropped and the field shows the book's real value again. So a field can never
 * display a number that was not actually stored.
 */
function BookControls({ book, onEditAll }) {
  const { t } = useLanguage();
  const { updateBook } = useBooks();
  const [drafts, setDrafts] = useState({});

  // Lets the unmount cleanup below see the latest drafts and book.
  const latest = useRef({});
  latest.current = { drafts, book, updateBook };

  // Closing the dialog (Escape, the backdrop, "Edit all details") must not throw away a number you typed.
  useEffect(
    () => () => {
      const { drafts: pending, book: current, updateBook: save } = latest.current;
      Object.entries(pending).forEach(([field, raw]) => {
        const next = toPage(raw);
        if (next !== (current[field] || 0)) save(current.id, { [field]: next });
      });
    },
    []
  );

  const shown = (field) => drafts[field] ?? storedValue(book, field);
  const edit = (field) => (event) => setDrafts((d) => ({ ...d, [field]: event.target.value }));
  const settle = (field) =>
    setDrafts((d) => {
      const { [field]: _done, ...rest } = d;
      return rest;
    });

  const commit = async (field) => {
    if (drafts[field] === undefined) return;
    const next = toPage(drafts[field]);
    if (next === (book[field] || 0)) {
      settle(field);
      return;
    }
    try {
      await updateBook(book.id, { [field]: next });
    } finally {
      settle(field);
    }
  };
  const commitOnEnter = (field) => (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit(field);
  };
  const progress = progressFor(book);

  return (
    <section className="pk-controls" aria-label={t("details.controls")}>
      <div className="pk-controls__row">
        <Field label={t("details.status")} as="select" value={book.status} onChange={(event) => updateBook(book.id, { status: event.target.value })}>
          {Object.keys(STATUSES).map((key) => (
            <option key={key} value={key}>
              {t(`status.${key}`)}
            </option>
          ))}
        </Field>
        <Field
          label={t("details.currentPage")}
          type="number"
          min="0"
          inputMode="numeric"
          value={shown("currentPage")}
          onChange={edit("currentPage")}
          onBlur={() => commit("currentPage")}
          onKeyDown={commitOnEnter("currentPage")}
        />
        <Field
          label={t("details.totalPages")}
          type="number"
          min="0"
          inputMode="numeric"
          value={shown("pages")}
          onChange={edit("pages")}
          onBlur={() => commit("pages")}
          onKeyDown={commitOnEnter("pages")}
        />
      </div>

      {book.pages ? (
        <div className="pk-controls__progress">
          <ProgressRibbon value={progress} label={t("details.progress", { pct: progress })} />
          <span>{t("details.progress", { pct: progress })}</span>
        </div>
      ) : null}

      <div className="pk-controls__row pk-controls__row--rate">
        <div className="pk-controls__rating">
          <span className="pk-controls__label">{t("details.rating")}</span>
          <RatingStars
            value={book.rating}
            label={t("details.rating")}
            starLabel={(n) => (n === 1 ? t("details.star") : t("details.stars", { n }))}
            clearLabel={t("details.clearRating")}
            onChange={(rating) => updateBook(book.id, { rating })}
          />
        </div>
        <div className="pk-controls__buttons">
          <Button
            variant={book.favorite ? "primary" : "secondary"}
            icon={Heart}
            aria-pressed={Boolean(book.favorite)}
            onClick={() => updateBook(book.id, { favorite: !book.favorite })}
          >
            {t("book.favoriteBadge")}
          </Button>
          <Button icon={Edit3} onClick={onEditAll}>
            {t("details.editAll")}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default BookControls;
