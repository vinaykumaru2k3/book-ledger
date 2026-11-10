import React, { useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Minus, Plus, Star } from "lucide-react";
import BookCover from "../../../shared/pk/BookCover";
import BookSpine from "../../../shared/pk/BookSpine";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useCountUp, useInView } from "../../../shared/lib/motion";
import { langOf } from "../../../shared/lib/script";
import { progressFor } from "../../../domain/status";
import { currentlyReading, recentlyFinished } from "../../../domain/library";
import { useAuth, useUi } from "../../../app/AppContext";
import { firstNameOf, goalPace, partOfDay, pileHeightCm, scriptMix } from "./insights";
import { useReadingGoal } from "./useReadingGoal";

const SCRIPT_COLORS = ["#8b1e2d", "#d9a441", "#3f5aa8", "#2f7d63", "#8e5ba8", "#c4622d", "#5a6b7d"];

/** A ring that fills to `percent`, with its centre left for content. */
function Ring({ percent, size = 120, stroke = 9, className = "", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={`pk-ring ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="pk-ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="pk-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          style={{ "--offset": c * (1 - percent / 100), "--full": c }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="pk-ring__centre">{children}</span>
    </span>
  );
}

/** The dark hero: greeting, summary and the book you are reading now. */
function ReadingHero({ books, stats }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openDetails } = useUi();
  const reading = useMemo(() => currentlyReading(books, 5), [books]);
  const upNext = useMemo(() => books.find((b) => b.status === "want"), [books]);
  const [pick, setPick] = useState(0);
  const book = reading[Math.min(pick, reading.length - 1)] || null;

  const now = new Date();
  const name = firstNameOf(user);
  const greeting = t(`dash.greet.${partOfDay(now)}`);
  const date = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const percent = book ? progressFor(book) : 0;
  const left = book && book.pages ? Math.max(book.pages - (book.currentPage || 0), 0) : 0;

  return (
    <section className="pk-dhero" aria-labelledby="dash-greeting">
      <div className="pk-dhero__intro">
        <p className="pk-dhero__date">{date}</p>
        <h2 id="dash-greeting" className="pk-dhero__greeting">
          {greeting}
          {name && (
            <>
              , <em>{name}</em>
            </>
          )}
          .
        </h2>
        <p className="pk-dhero__summary">{t("dash.summary", { reading: stats.reading, want: stats.want, total: stats.total })}</p>
        <ul className="pk-dhero__chips" aria-label={t("dash.chip.label")}>
          <li>
            <strong>{stats.total}</strong> {t("dash.chip.books")}
          </li>
          <li>
            <strong>{stats.done}</strong> {t("dash.chip.finished")}
          </li>
          <li>
            <strong>{stats.favorites}</strong> {t("dash.chip.favorites")}
          </li>
        </ul>
      </div>

      {book ? (
        <div className="pk-spot">
          <button type="button" className="pk-spot__cover" onClick={(e) => openDetails(book, e.currentTarget.querySelector(".pk-cover"))}>
            <BookCover book={book} size="fluid" />
            <span className="pk-visually-hidden">{t("dash.open", { title: book.title })}</span>
          </button>
          <div className="pk-spot__body">
            <p className="pk-spot__label">{t("dash.continue")}</p>
            <h3 className="pk-spot__title" lang={langOf(book.title)}>
              {book.title}
            </h3>
            {book.author && (
              <p className="pk-spot__author" lang={langOf(book.author)}>
                {book.author}
              </p>
            )}
            <div className="pk-spot__progress">
              <Ring percent={percent} size={64} stroke={6} className="pk-ring--gold">
                <strong>{percent}%</strong>
              </Ring>
              <p>
                {book.pages ? (
                  <>
                    {t("dash.page", { current: (book.currentPage || 0).toLocaleString(), total: book.pages.toLocaleString() })}
                    <span>{t("dash.left", { count: left.toLocaleString() })}</span>
                  </>
                ) : (
                  t("dash.noPages")
                )}
              </p>
            </div>
            <button type="button" className="pk-dbtn" onClick={() => openDetails(book)}>
              {t("dash.update")}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            {reading.length > 1 && (
              <div className="pk-spot__switch" role="group" aria-label={t("dash.switch")}>
                {reading.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className="pk-spot__thumb"
                    aria-pressed={item.id === book.id}
                    aria-label={item.title}
                    title={item.title}
                    onClick={() => setPick(index)}
                  >
                    <BookCover book={item} size="fluid" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pk-spot pk-spot--empty">
          <BookOpen size={28} aria-hidden="true" />
          <p className="pk-spot__label">{t("dash.nothing")}</p>
          {upNext ? (
            <button type="button" className="pk-dbtn" onClick={() => openDetails(upNext)}>
              {t("dash.upNext", { title: upNext.title })}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <p className="pk-spot__hint">{t("dash.addHint")}</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Bento of yearly goal, pages read, average rating and the scripts on the shelves. */
function DashboardBento({ books, stats }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const live = useInView(ref, { threshold: 0.15 });
  const [goal, setGoal] = useReadingGoal();
  const year = new Date().getFullYear();
  const pace = goalPace(stats.finishedThisYear, goal);
  const pages = useCountUp(stats.pagesRead || 0, { start: live });
  const finished = useMemo(() => recentlyFinished(books, 12), [books]);
  const mix = useMemo(() => scriptMix(books), [books]);
  const rated = books.filter((b) => b.rating > 0).length;
  const rating = Number(stats.averageRating) || 0;

  return (
    <div className={`pk-bento2${live ? " is-live" : ""}`} ref={ref} role="group" aria-label={t("stats.label")}>
      <section className="pk-card2 pk-card2--goal" aria-labelledby="dash-goal">
        <h3 id="dash-goal" className="pk-card2__label">
          {t("dash.goal.title", { year })}
        </h3>
        <Ring percent={live ? pace.percent : 0} size={148} stroke={11}>
          <strong className="pk-goal__count">{stats.finishedThisYear}</strong>
          <span className="pk-goal__of">{t("dash.goal.of", { goal })}</span>
        </Ring>
        <p className={`pk-goal__pace pk-goal__pace--${pace.status}`}>
          {pace.status === "done"
            ? t("dash.goal.done")
            : pace.status === "onTrack"
              ? t("dash.goal.onTrack", { count: pace.remaining })
              : t("dash.goal.behind", { count: pace.behindBy })}
        </p>
        <div className="pk-goal__edit">
          <button type="button" className="pk-goal__btn" onClick={() => setGoal(goal - 1)} aria-label={t("dash.goal.less")} disabled={goal <= 1}>
            <Minus size={16} aria-hidden="true" />
          </button>
          <span>{t("dash.goal.target", { goal })}</span>
          <button type="button" className="pk-goal__btn" onClick={() => setGoal(goal + 1)} aria-label={t("dash.goal.more")}>
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="pk-card2 pk-card2--pages" aria-labelledby="dash-pages">
        <h3 id="dash-pages" className="pk-card2__label">
          {t("dash.pages.title")}
        </h3>
        <p className="pk-pages__value">{pages.toLocaleString()}</p>
        <p className="pk-pages__fact">{t("dash.pages.fact", { cm: pileHeightCm(stats.pagesRead || 0) })}</p>
        {finished.length > 0 && (
          <div className="pk-pages__shelf" aria-hidden="true">
            <div className="pk-pages__books">
              {finished.map((book) => (
                <BookSpine key={book.id} book={book} scale={0.5} />
              ))}
            </div>
            <div className="pk-pages__plank" />
          </div>
        )}
      </section>

      <section className="pk-card2 pk-card2--rating" aria-labelledby="dash-rating">
        <h3 id="dash-rating" className="pk-card2__label">
          {t("dash.rating.title")}
        </h3>
        <p className="pk-rating__value">{rating ? rating.toFixed(1) : "–"}</p>
        <span className="pk-rating__stars" aria-label={t("dash.rating.stars", { rating: rating.toFixed(1) })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="pk-rating__star" style={{ "--fill": `${Math.min(Math.max(rating - n + 1, 0), 1) * 100}%` }}>
              <Star size={18} aria-hidden="true" />
              <Star size={18} aria-hidden="true" fill="currentColor" />
            </span>
          ))}
        </span>
        <p className="pk-card2__note">{t("dash.rating.from", { count: rated })}</p>
      </section>

      <section className="pk-card2 pk-card2--scripts" aria-labelledby="dash-scripts">
        <h3 id="dash-scripts" className="pk-card2__label">
          {t("dash.scripts.title")}
        </h3>
        <p className="pk-scripts__value">{t("dash.scripts.count", { count: mix.length })}</p>
        <div className="pk-scripts__bar" aria-hidden="true">
          {mix.map((entry, index) => (
            <span key={entry.key} style={{ flexGrow: entry.count, background: SCRIPT_COLORS[index % SCRIPT_COLORS.length] }} />
          ))}
        </div>
        <ul className="pk-scripts__legend">
          {mix.map((entry, index) => (
            <li key={entry.key}>
              <i style={{ background: SCRIPT_COLORS[index % SCRIPT_COLORS.length] }} aria-hidden="true" />
              {entry.name} <strong>{entry.count}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * The library's home view: a night-sky hero that greets the reader and puts
 * the current book in the spotlight, then a bento of reading insights.
 */
function LibraryDashboard({ books, stats }) {
  return (
    <div className="pk-dash">
      <ReadingHero books={books} stats={stats} />
      <DashboardBento books={books} stats={stats} />
    </div>
  );
}

export default LibraryDashboard;
