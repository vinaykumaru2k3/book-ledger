import React, { useEffect, useRef, useState } from "react";
import { Check, ImageDown } from "lucide-react";
import Button from "../../../shared/pk/Button";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { findCoverCandidates } from "../../../services/coverSearch";

const SOURCE_NAMES = { wikipedia: "Wikipedia", openlibrary: "Open Library", google: "Google Books" };

/**
 * "Find cover": searches Wikipedia, Open Library and Google Books for the book
 * in the form and shows the real covers found, to pick one. Results belong to
 * the title and author they were searched for and clear when those change.
 */
function CoverPicker({ book, value, onPick, search = findCoverCandidates }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "idle", results: [] });
  const queryKey = `${book.title || ""}|${book.author || ""}|${book.isbn || ""}`;
  const latestKey = useRef(queryKey);

  useEffect(() => {
    latestKey.current = queryKey;
    setState({ status: "idle", results: [] });
  }, [queryKey]);

  async function find() {
    const key = queryKey;
    setState({ status: "searching", results: [] });
    let results = [];
    try {
      results = await search(book);
    } catch {
      results = [];
    }
    if (latestKey.current === key) setState({ status: "done", results });
  }

  return (
    <div className="pk-coverpicker">
      <Button size="sm" icon={ImageDown} loading={state.status === "searching"} disabled={!book.title?.trim()} onClick={find}>
        {state.status === "searching" ? t("cover.searching") : t("cover.find")}
      </Button>

      {state.status === "done" && !state.results.length && <p className="pk-coverpicker__empty">{t("cover.none")}</p>}

      {state.results.length > 0 && (
        <div className="pk-coverpicker__grid" role="group" aria-label={t("cover.results")}>
          {state.results.map((candidate) => {
            const chosen = candidate.url === value;
            const name = SOURCE_NAMES[candidate.source] || candidate.source;
            return (
              <button
                key={candidate.url}
                type="button"
                className="pk-coverpicker__option"
                aria-pressed={chosen}
                title={candidate.label}
                aria-label={t("cover.option", { source: name })}
                onClick={() => onPick(candidate.url, candidate.source)}
              >
                <img src={candidate.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                <span className="pk-coverpicker__source" aria-hidden="true">{name}</span>
                {chosen && (
                  <span className="pk-coverpicker__check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CoverPicker;
