import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Crown, Plus, RefreshCw, Star, Trophy } from "lucide-react";
import BookCover from "../../shared/pk/BookCover";
import { langOf } from "../../shared/lib/script";
import { searchOpenLibrary } from "../../services/bookApi";
import { useBooks } from "../../app/AppContext";
import { useDiscoverActions } from "./useDiscoverActions";
import { alreadyOwned } from "./recommendationsModel";
import { CANDIDATES, CHART_FIELDS, CHART_MODES, GENRES, chartFor, curateChart, recentSince } from "./topChartFilters";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const GENRE_KEY = "pustaka:chart-genre";
const cache = new Map(); // charts already fetched this session, by genre

function savedGenre() {
  try {
    return GENRES.find((g) => g.id === localStorage.getItem(GENRE_KEY)) || GENRES[0];
  } catch {
    return GENRES[0];
  }
}

/** The curated chart for a genre, fetched once per session. */
function useChart(genre) {
  const [state, setState] = useState(() => ({ chart: cache.get(genre.id) || [], loading: !cache.has(genre.id), error: "" }));

  const load = useCallback(
    async (isCancelled = () => false) => {
      if (cache.has(genre.id)) {
        setState({ chart: cache.get(genre.id), loading: false, error: "" });
        return;
      }
      setState({ chart: [], loading: true, error: "" });
      try {
        const docs = await searchOpenLibrary({ ...genre.query, sort: "readinglog", lang: "en", fields: CHART_FIELDS }, CANDIDATES);
        const chart = curateChart(docs, genre.id);
        if (chart.length) cache.set(genre.id, chart);
        if (!isCancelled()) setState({ chart, loading: false, error: chart.length ? "" : "Open Library sent back no books for this chart." });
      } catch {
        if (!isCancelled()) setState({ chart: [], loading: false, error: "Couldn't reach Open Library. Check your connection and try again." });
      }
    },
    [genre],
  );

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { ...state, retry: () => load() };
}

function Signals({ item }) {
  return (
    <span className="pk-chart__signals">
      {item.rating > 0 && (
        <span className="pk-chart__rating" aria-label={`Rated ${item.rating} out of 5 by ${item.ratingCount} readers`}>
          <Star size={12} fill="currentColor" aria-hidden="true" />
          {item.rating.toFixed(1)}
        </span>
      )}
      {item.readers > 0 && <span>{compact.format(item.readers)} readers</span>}
      {item.readingNow > 0 && (
        <span className="pk-chart__now">
          <span className="pk-chart__pulse" aria-hidden="true" />
          {compact.format(item.readingNow)} reading now
        </span>
      )}
    </span>
  );
}

/** "Want to read", or a quiet mark when the book is already on your shelves. */
function ChartAction({ item, owned, onAdd, large = false }) {
  if (owned) {
    return (
      <span className={`pk-chart__owned${large ? " pk-chart__owned--lg" : ""}`} title="On your shelf">
        <Check size={14} aria-hidden="true" />
        <span className="pk-chart__actionLabel">On your shelf</span>
      </span>
    );
  }
  return (
    <button type="button" className={`pk-chart__add${large ? " pk-chart__add--lg" : ""}`} onClick={() => onAdd(item)} aria-label={`Add ${item.title} to Want to read`}>
      <Plus size={14} aria-hidden="true" />
      <span className="pk-chart__actionLabel">Want to read</span>
    </button>
  );
}

function PodiumPlace({ item, owned, actions }) {
  return (
    <li className={`pk-podium__place pk-podium__place--${item.rank}`}>
      <span className="pk-podium__rank" aria-label={`Number ${item.rank}`}>
        {item.rank === 1 ? <Crown size={18} aria-hidden="true" /> : null}
        {String(item.rank).padStart(2, "0")}
      </span>
      <button type="button" className="pk-podium__cover" onClick={() => actions.onDetails(item)} aria-label={`Details for ${item.title}`}>
        <BookCover book={item} size="fluid" />
      </button>
      <h3 className="pk-podium__title" lang={langOf(item.title)}>
        {item.title}
      </h3>
      <p className="pk-podium__author" lang={langOf(item.primaryAuthor)}>
        {item.primaryAuthor}
        {item.publishedYear ? ` · ${item.publishedYear}` : ""}
      </p>
      <Signals item={item} />
      <ChartAction item={item} owned={owned} onAdd={actions.onAdd} large />
    </li>
  );
}

function ChartRow({ item, owned, actions }) {
  return (
    <li className={`pk-chart__row${owned ? " pk-chart__row--owned" : ""}`}>
      <span className="pk-chart__rank">{item.rank}</span>
      <button type="button" className="pk-chart__thumb" onClick={() => actions.onDetails(item)} aria-label={`Details for ${item.title}`}>
        <BookCover book={item} size="fluid" />
      </button>
      <div className="pk-chart__body">
        <button type="button" className="pk-chart__title" onClick={() => actions.onDetails(item)} lang={langOf(item.title)}>
          {item.title}
        </button>
        <p className="pk-chart__author" lang={langOf(item.primaryAuthor)}>
          {item.primaryAuthor}
          {item.publishedYear ? ` · ${item.publishedYear}` : ""}
        </p>
        <Signals item={item} />
      </div>
      <ChartAction item={item} owned={owned} onAdd={actions.onAdd} />
    </li>
  );
}

function Skeleton() {
  return (
    <div className="pk-chart__skeleton" aria-hidden="true">
      <div className="pk-podium pk-podium--ghost">
        {[2, 1, 3].map((n) => (
          <div key={n} className={`pk-chart__ghost pk-podium__ghost pk-podium__place--${n}`} />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="pk-chart__ghost pk-chart__ghostRow" />
      ))}
    </div>
  );
}

/** How much of this chart you have read, as a small ring. */
function ChartScore({ read, shelved, total }) {
  const share = total ? read / total : 0;
  const r = 30;
  const length = 2 * Math.PI * r;
  return (
    <div className="pk-chartscore" aria-label={`You have read ${read} of these ${total} books; ${shelved} are on your shelves`}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="pk-chartscore__track" />
        <circle cx="36" cy="36" r={r} className="pk-chartscore__fill" strokeDasharray={`${length * share} ${length}`} />
      </svg>
      <div>
        <p className="pk-chartscore__big">
          {read}
          <span>/{total}</span>
        </p>
        <p className="pk-chartscore__label">read from this chart</p>
        {shelved > read && <p className="pk-chartscore__label">
            {shelved - read} {read ? "more " : ""}on your shelves
</p>}
      </div>
    </div>
  );
}

/** Top Books: the most-read books in a genre, from Open Library's reading logs. */
function TopCharts() {
  const { books } = useBooks();
  const { quickAdd, viewDetails } = useDiscoverActions();
  const [genre, setGenre] = useState(savedGenre);
  const [mode, setMode] = useState("read");
  const [hideOwned, setHideOwned] = useState(false);
  const { chart, loading, error, retry } = useChart(genre);
  const actions = { onAdd: quickAdd, onDetails: viewDetails };

  const chooseGenre = (next) => {
    setGenre(next);
    try {
      localStorage.setItem(GENRE_KEY, next.id);
    } catch {
      // Remembering the tab is a convenience only.
    }
  };

  const owned = useMemo(() => new Set(chart.filter((item) => alreadyOwned(books, item)).map((item) => item.id)), [chart, books]);
  const read = useMemo(() => {
    const finished = books.filter((b) => b.status === "done");
    return chart.filter((item) => alreadyOwned(finished, item)).length;
  }, [chart, books]);

  const ranked = useMemo(() => chartFor(chart, mode), [chart, mode]);
  const visible = hideOwned ? ranked.filter((item) => !owned.has(item.id)) : ranked;
  // The podium is for the real top three; hiding owned books only trims the list.
  const podium = hideOwned ? [] : visible.slice(0, 3);
  const list = hideOwned ? visible : visible.slice(3);
  const modeNote = {
    read: "Ranked by readers who logged it on Open Library",
    loved: "Ranked by rating, weighted so a few five-star votes can't jump the queue",
    recent: `Only books first published since ${recentSince()}`,
  }[mode];

  return (
    <div className="pk-charts">
      <section className="pk-charthero" aria-labelledby="charthero-title">
        <div className="pk-charthero__text">
          <p className="pk-charthero__kicker">
            <Trophy size={14} aria-hidden="true" />
            Top books · live from reading logs
          </p>
          <h2 id="charthero-title" className="pk-charthero__title">
            The <em>{genre.label.toLowerCase()}</em> chart
          </h2>
          <p className="pk-charthero__sub">{genre.blurb}.</p>
        </div>
        {!loading && chart.length > 0 && <ChartScore read={read} shelved={owned.size} total={chart.length} />}
      </section>

      <nav className="pk-chartgenres" aria-label="Charts">
        {GENRES.map((g) => (
          <button key={g.id} type="button" className="pk-chartgenres__pill" aria-pressed={g.id === genre.id} onClick={() => chooseGenre(g)}>
            {g.label}
          </button>
        ))}
      </nav>

      <div className="pk-chartbar">
        <div className="pk-chartmodes" role="radiogroup" aria-label="Rank by">
          {CHART_MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className="pk-chartmodes__btn" onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="pk-chartbar__note">{modeNote}</p>
        <label className="pk-chartbar__toggle">
          <input type="checkbox" checked={hideOwned} onChange={(e) => setHideOwned(e.target.checked)} />
          Hide books I have
        </label>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="pk-chart__message" role="alert">
          <p>{error}</p>
          <button type="button" className="pk-chart__add pk-chart__add--lg" onClick={retry}>
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="pk-chart__message">
          <BookOpen size={22} aria-hidden="true" />
          <p>{hideOwned ? "You have every book on this chart. Impressive." : `No ${genre.label.toLowerCase()} books from the last ten years made this chart yet.`}</p>
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <ol className="pk-podium" aria-label="Top three">
              {podium.map((item) => (
                <PodiumPlace key={item.id} item={item} owned={owned.has(item.id)} actions={actions} />
              ))}
            </ol>
          )}
          {list.length > 0 && (
            <ol className="pk-chart__list" aria-label={podium.length ? "The rest of the chart" : "The chart"}>
              {list.map((item) => (
                <ChartRow key={item.id} item={item} owned={owned.has(item.id)} actions={actions} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

export default TopCharts;
