import React, { useMemo } from "react";
import { STATUSES } from "../../domain/status";
import { currentlyReading, recentlyFinished } from "../../domain/library";
import Card from "../../shared/pk/Card";
import ProgressRibbon from "../../shared/pk/ProgressRibbon";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import ReadingStack from "./ReadingStack";

/** Right-hand column of the library: completion bars plus reading lists. */
function LibrarySidePanel({ books, stats }) {
  const { t } = useLanguage();
  const reading = useMemo(() => currentlyReading(books), [books]);
  const finished = useMemo(() => recentlyFinished(books), [books]);

  return (
    <aside className="pk-side" aria-label={t("side.progress")}>
      <Card className="pk-side__card">
        <div className="pk-side__head">
          <h2 className="pk-side__title">{t("side.progress")}</h2>
          <span className="pk-side__badge">{t("side.done", { pct: stats.completionRate })}</span>
        </div>
        <ProgressRibbon value={stats.completionRate} label={t("side.progress")} />

        <ul className="pk-statusbars">
          {Object.keys(STATUSES).map((key) => (
            <li key={key} className="pk-statusbar">
              <span className="pk-statusbar__label">{t(`status.${key}`)}</span>
              <span className="pk-statusbar__track" aria-hidden="true">
                <i className={`pk-statusbar__fill pk-statusbar__fill--${key}`} style={{ width: `${stats.total ? (stats[key] / stats.total) * 100 : 0}%` }} />
              </span>
              <strong>{stats[key]}</strong>
            </li>
          ))}
        </ul>
      </Card>

      <ReadingStack title={t("side.readingNow")} books={reading} empty={t("side.noActive")} />
      <ReadingStack title={t("side.recentlyFinished")} books={finished} empty={t("side.noFinished")} />
    </aside>
  );
}

export default LibrarySidePanel;
