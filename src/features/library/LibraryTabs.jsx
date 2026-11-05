import React from "react";
import Tabs from "../../shared/pk/Tabs";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/** All / Want / Reading / Finished / Favorites, each with its count. */
function LibraryTabs({ view, stats, onChange }) {
  const { t } = useLanguage();
  const entries = [
    ["all", t("nav.allBooks"), stats.total],
    ["want", t("status.want"), stats.want],
    ["reading", t("status.reading"), stats.reading],
    ["done", t("status.done"), stats.done],
    ["favorites", t("nav.favorites"), stats.favorites],
  ];

  return (
    <div className="pk-library-tabs">
      <Tabs
        label={t("nav.collection")}
        value={view}
        onChange={onChange}
        tabs={entries.map(([id, label, count]) => ({
          id,
          label: (
            <>
              {label} <span className="pk-tab__count">{count}</span>
            </>
          ),
        }))}
      />
    </div>
  );
}

export default LibraryTabs;
