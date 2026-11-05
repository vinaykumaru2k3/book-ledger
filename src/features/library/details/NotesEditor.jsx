import React, { useEffect, useRef, useState } from "react";
import Field from "../../../shared/pk/Field";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useBooks } from "../../../app/AppContext";

/**
 * Personal notes, saved when you click away, and also when the dialog closes
 * without a click (Escape), so typed notes are never lost. A polite "Saved"
 * confirms an ordinary save.
 */
function NotesEditor({ book }) {
  const { t } = useLanguage();
  const { updateBook } = useBooks();
  const [draft, setDraft] = useState(book.notes || "");
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  // The unmount cleanup needs the latest values, not the ones from the first render.
  const latest = useRef({});
  latest.current = { draft, book, updateBook };

  useEffect(() => setDraft(book.notes || ""), [book.notes]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      const { draft: text, book: current, updateBook: save } = latest.current;
      if (text !== (current.notes || "")) save(current.id, { notes: text });
    },
    []
  );

  const save = async () => {
    if (draft === (book.notes || "")) return;
    await updateBook(book.id, { notes: draft });
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="pk-notes">
      <Field
        label={t("details.notes")}
        as="textarea"
        rows={4}
        value={draft}
        placeholder={t("details.notesPlaceholder")}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
      />
      <span className="pk-notes__saved" role="status" aria-live="polite">
        {saved ? t("details.notesSaved") : ""}
      </span>
    </div>
  );
}

export default NotesEditor;
