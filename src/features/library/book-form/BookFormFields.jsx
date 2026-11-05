import React from "react";
import { Tags } from "lucide-react";
import Cover from "../../../shared/ui/Cover";
import Rating from "../../../shared/ui/Rating";
import Field from "../../../shared/ui/Field";
import { STATUSES } from "../../../domain/status";
import ShelfPicker from "./ShelfPicker";

/** The editable fields of a book. Controlled: all state lives in `form`. */
function BookFormFields({ form, patch, shelfOptions }) {
  const text = (name) => ({
    value: form[name] ?? "",
    onChange: (event) => patch({ [name]: event.target.value }),
  });

  return (
    <>
      <div className="form-cover-preview">
        <Cover book={{ title: form.title || "Preview", author: form.author || "", coverUrl: form.coverUrl || "" }} />
      </div>

      <div className="form-grid">
        <Field label="Title" wide>
          <input required {...text("title")} placeholder="e.g. Karvalo" />
        </Field>

        <Field label="Author">
          <input {...text("author")} placeholder="e.g. K. P. Poornachandra Tejaswi" />
        </Field>

        <Field label="Published Year">
          <input inputMode="numeric" {...text("publishedYear")} placeholder="e.g. 1980" />
        </Field>

        <Field label="Total Pages">
          <input min="0" type="number" {...text("pages")} placeholder="e.g. 350" />
        </Field>

        <Field label="Current Page">
          <input min="0" type="number" {...text("currentPage")} placeholder="e.g. 45" />
        </Field>

        <Field label="Status">
          <select {...text("status")}>
            {Object.entries(STATUSES).map(([key, status]) => (
              <option key={key} value={key}>
                {status.longLabel}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rating">
          <div className="rating-input">
            <Rating value={form.rating} onChange={(rating) => patch({ rating })} />
          </div>
        </Field>

        <Field label="Tags / Genres" wide>
          <div className="field-with-icon">
            <Tags size={17} />
            <input {...text("tags")} placeholder="e.g. Fiction, Kannada Literature, Mystery" />
          </div>
        </Field>

        <ShelfPicker
          available={shelfOptions}
          selected={form.shelves || []}
          onChange={(shelves) => patch({ shelves })}
        />

        <Field label="Book Description (Synopsis)" wide>
          <textarea {...text("description")} rows={4} placeholder="Synopsis of the book from API search..." />
        </Field>

        <Field label="Notes & Thoughts" wide>
          <textarea {...text("notes")} rows={3} placeholder="Write your review, quotes or key thoughts here..." />
        </Field>

        <Field label="Cover Image URL" wide>
          <input {...text("coverUrl")} placeholder="https://example.com/cover.jpg" />
        </Field>
      </div>
    </>
  );
}

export default BookFormFields;
