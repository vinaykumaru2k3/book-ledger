import React from "react";
import { BookCheck } from "lucide-react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

/**
 * The little celebration when a book becomes "finished": a ring expands from a
 * check mark and a message appears. Pure CSS animation (see pk-details.css),
 * so it is skipped automatically when the user prefers reduced motion.
 */
function FinishedBurst() {
  const { t } = useLanguage();
  return (
    <div className="pk-burst" role="status">
      <span className="pk-burst__ring" aria-hidden="true" />
      <span className="pk-burst__ring pk-burst__ring--late" aria-hidden="true" />
      <BookCheck size={22} aria-hidden="true" />
      <strong>{t("details.finished")}</strong>
    </div>
  );
}

export default FinishedBurst;
