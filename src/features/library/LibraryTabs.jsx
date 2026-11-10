import React, { useLayoutEffect, useRef, useState } from "react";
import Tabs from "../../shared/pk/Tabs";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/**
 * The collection heading and the All / Want / Reading / Finished / Favorites
 * tabs, each with a status dot and its count. An ink underline glides to the
 * selected tab.
 */
function LibraryTabs({ view, stats, onChange }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const [line, setLine] = useState(null);
  const entries = [
    ["all", t("nav.allBooks"), stats.total],
    ["want", t("status.want"), stats.want],
    ["reading", t("status.reading"), stats.reading],
    ["done", t("status.done"), stats.done],
    ["favorites", t("nav.favorites"), stats.favorites],
  ];

  useLayoutEffect(() => {
    const active = ref.current?.querySelector('[role="tab"][aria-selected="true"]');
    setLine(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
  }, [view, stats.total]);

  return (
    <div className="pk-collection">
      <div className="pk-collection__head">
        <h2 className="pk-collection__title">{t("collection.title")}</h2>
        <span className="pk-collection__count">{t("count.books", { count: stats.total })}</span>
      </div>
      <div className="pk-library-tabs" ref={ref}>
        <Tabs
          label={t("nav.collection")}
          value={view}
          onChange={onChange}
          tabs={entries.map(([id, label, count]) => ({
            id,
            label: (
              <>
                <span className={`pk-tab__dot pk-tab__dot--${id}`} aria-hidden="true" />
                {label} <span className="pk-tab__count">{count}</span>
              </>
            ),
          }))}
        />
        {line && <span className="pk-library-tabs__line" style={{ transform: `translateX(${line.left}px)`, width: line.width }} aria-hidden="true" />}
      </div>
    </div>
  );
}

export default LibraryTabs;
