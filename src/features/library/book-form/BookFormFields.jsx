import React from "react";
import BookCover from "../../../shared/pk/BookCover";
import Field from "../../../shared/pk/Field";
import RatingStars from "../../../shared/pk/RatingStars";
import { STATUSES } from "../../../domain/status";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import ShelfPicker from "./ShelfPicker";

/**
 * The editable fields of a book, essentials first. Rarely-needed details sit
 * under a "More details" disclosure, open by default when editing.
 * Controlled: all state lives in `form`.
 */
function BookFormFields({ form, patch, shelfOptions, editing, focusTitle }) {
  const { t } = useLanguage();
  const text = (name) => ({
    value: form[name] ?? "",
    onChange: (event) => patch({ [name]: event.target.value }),
  });

  return (
    <>
      <div className="pk-form__basics">
        <div className="pk-form__cover">
          <BookCover book={{ title: form.title || "?", author: form.author || "", coverUrl: form.coverUrl || "" }} size="md" />
        </div>

        <div className="pk-form__fields">
          <Field label={`${t("form.title")} *`} required {...text("title")} placeholder={t("form.titlePlaceholder")} data-autofocus={focusTitle || undefined} />
          <Field label={t("form.author")} {...text("author")} placeholder={t("form.authorPlaceholder")} />

          <div className="pk-form__row">
            <Field label={t("form.status")} as="select" {...text("status")}>
              {Object.keys(STATUSES).map((key) => (
                <option key={key} value={key}>
                  {t(`status.${key}`)}
                </option>
              ))}
            </Field>
            <Field label={t("form.currentPage")} type="number" min="0" inputMode="numeric" {...text("currentPage")} />
            <Field label={t("form.totalPages")} type="number" min="0" inputMode="numeric" {...text("pages")} />
          </div>
        </div>
      </div>

      <details className="pk-more" open={editing}>
        <summary>{t("form.moreDetails")}</summary>
        <div className="pk-form__more">
          <div className="pk-form__row">
            <Field label={t("form.year")} inputMode="numeric" {...text("publishedYear")} placeholder="1980" />
            <div className="pk-form__rating">
              <span className="pk-field__label">{t("form.rating")}</span>
              <RatingStars
                value={form.rating}
                label={t("form.rating")}
                starLabel={(n) => (n === 1 ? t("details.star") : t("details.stars", { n }))}
                clearLabel={t("details.clearRating")}
                onChange={(rating) => patch({ rating })}
              />
            </div>
          </div>

          <Field label={t("form.tags")} {...text("tags")} placeholder={t("form.tagsPlaceholder")} />
          <ShelfPicker available={shelfOptions} selected={form.shelves || []} onChange={(shelves) => patch({ shelves })} />
          <Field label={t("form.description")} as="textarea" rows={4} {...text("description")} placeholder={t("form.descriptionPlaceholder")} />
          <Field label={t("form.notes")} as="textarea" rows={3} {...text("notes")} placeholder={t("form.notesPlaceholder")} />
          <Field label={t("form.cover")} {...text("coverUrl")} placeholder="https://example.com/cover.jpg" />
        </div>
      </details>
    </>
  );
}

export default BookFormFields;
