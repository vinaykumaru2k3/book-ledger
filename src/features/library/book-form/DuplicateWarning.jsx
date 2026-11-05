import React from "react";
import { AlertTriangle } from "lucide-react";
import { STATUSES } from "../../../domain/status";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

/** Shown when the book being added looks like one already in the library. */
function DuplicateWarning({ book }) {
  const { t } = useLanguage();
  const status = STATUSES[book.status] ? t(`status.${book.status}`) : book.status;
  const message = book.author
    ? t("form.duplicateBy", { title: book.title, author: book.author, status })
    : t("form.duplicate", { title: book.title, status });

  return (
    <div className="pk-alert" role="status">
      <AlertTriangle size={18} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export default DuplicateWarning;
