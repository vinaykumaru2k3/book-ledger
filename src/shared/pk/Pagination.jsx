import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Previous / numbered / next buttons with a "Showing a–b of n books" line.
 * Renders nothing for a single page. For many pages it shows the first, last
 * and the pages around the current one, with "…" for the gaps.
 */
function pageWindow(page, pageCount) {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const shown = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  return shown.flatMap((n, i) => (i > 0 && n - shown[i - 1] > 1 ? ["gap-" + n, n] : [n]));
}

function Pagination({ page, pageCount, start, pageSize, total, onChange }) {
  const { t } = useLanguage();
  if (pageCount <= 1) return null;

  return (
    <nav className="pk-pagination" aria-label={t("page.label")}>
      <p className="pk-pagination__info">
        {t("page.showing", { from: start + 1, to: Math.min(start + pageSize, total), total })}
      </p>
      <div className="pk-pagination__buttons">
        <button type="button" className="pk-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label={t("page.prev")}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        {pageWindow(page, pageCount).map((item) =>
          typeof item === "string" ? (
            <span key={item} className="pk-page-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={item === page ? "pk-page-btn pk-page-btn--active" : "pk-page-btn"}
              aria-current={item === page ? "page" : undefined}
              aria-label={t("page.go", { n: item })}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          )
        )}

        <button type="button" className="pk-page-btn" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label={t("page.next")}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export { pageWindow };
export default Pagination;
