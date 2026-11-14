import React from "react";
import { Check, Loader2 } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";

const STAGES = ["authors", "library", "relations", "details", "mentions"];

/** Live progress while a map is generated: each stage, and what has been found so far. */
export function Progress({ progress, kind }) {
  const { t } = useLanguage();
  const stages = STAGES.filter((s) => s !== "library" || kind === "library");
  const current = stages.indexOf(progress?.stage);
  const c = progress || {};
  return (
    <div className="pk-map-progress" role="status" aria-live="polite">
      <ol className="pk-map-progress__stages">
        {stages.map((stage, i) => {
          const state = progress?.stage === "done" || i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={stage} className={`pk-map-progress__stage pk-map-progress__stage--${state}`}>
              {state === "done" ? <Check size={16} aria-hidden="true" /> : state === "active" ? <Loader2 size={16} className="pk-spin" aria-hidden="true" /> : <span className="pk-map-progress__dot" aria-hidden="true" />}
              <span>
                {t(`maps.stage.${stage}`)}
                {stage === "library" && c.of ? ` (${c.books}/${c.of})` : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="pk-map-progress__counts">{t("maps.countsWithLinks", { authors: c.authors || 0, works: c.works || 0, movements: c.movements || 0, links: c.links || 0 })}</p>
    </div>
  );
}
