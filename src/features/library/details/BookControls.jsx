import React, { useEffect, useState } from "react";
import { Edit3, Heart } from "lucide-react";
import Button from "../../../shared/pk/Button";
import Field from "../../../shared/pk/Field";
import ProgressRibbon from "../../../shared/pk/ProgressRibbon";
import RatingStars from "../../../shared/pk/RatingStars";
import { STATUSES, progressFor } from "../../../domain/status";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useBooks } from "../../../app/AppContext";

const toPage = (value) => Math.max(0, Number.parseInt(value, 10) || 0);

/**
 * Inline editing of a library book: status, pages read, rating and favourite.
 * Each change is saved straight away through `updateBook`, which also keeps
 * status and progress consistent (finishing the last page marks it finished).
 */
function BookControls({ book, onEditAll }) {
  const { t } = useLanguage();
  const { updateBook } = useBooks();
  const [current, setCurrent] = useState(String(book.currentPage || 0));
  const [total, setTotal] = useState(book.pages ? String(book.pages) : "");

  // Follow changes made elsewhere (status promotion, edits in another dialog).
  useEffect(() => setCurrent(String(book.currentPage || 0)), [book.currentPage]);
  useEffect(() => setTotal(book.pages ? String(book.pages) : ""), [book.pages]);

  const commit = (field, raw) => {
    const next = toPage(raw);
    if (next !== (book[field] || 0)) updateBook(book.id, { [field]: next });
  };
  const commitOnEnter = (field, raw) => (event) => event.key === "Enter" && (event.preventDefault(), commit(field, raw));
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
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          onBlur={() => commit("currentPage", current)}
          onKeyDown={commitOnEnter("currentPage", current)}
        />
        <Field
          label={t("details.totalPages")}
          type="number"
          min="0"
          inputMode="numeric"
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          onBlur={() => commit("pages", total)}
          onKeyDown={commitOnEnter("pages", total)}
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
