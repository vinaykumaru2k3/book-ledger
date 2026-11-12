/** The sections of the Insights page below the hero. Each is a pure view of its props. */
import React, { useState } from "react";
import { BookOpen, Gauge, Library, Star } from "lucide-react";
import { useUi } from "../../app/AppContext";
import BookCover from "../../shared/pk/BookCover";
import { langOf } from "../../shared/lib/script";
import { ALL_TIME, MONTHS } from "./analyticsModel";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

function Section({ id, title, note, children, className = "" }) {
  return (
    <section className={`pk-ins-card ${className}`.trim()} aria-labelledby={id}>
      <header className="pk-ins-card__head">
        <h3 id={id}>{title}</h3>
        {note && <p>{note}</p>}
      </header>
      {children}
    </section>
  );
}

export function StatStrip({ insights }) {
  const { library } = insights;
  const tiles = [
    { icon: BookOpen, label: "Pages read", value: insights.pages.toLocaleString(), hint: `${insights.finishedCount} finished` },
    {
      icon: Star,
      label: "Average rating",
      value: insights.ratedCount ? `${insights.averageRating} ★` : "None yet",
      hint: `${insights.ratedCount} rated`,
    },
    { icon: Gauge, label: "Pages per book", value: insights.averagePages || "None yet", hint: "on average" },
    { icon: Library, label: "On your shelves", value: library.total, hint: `${library.reading} reading, ${library.want} waiting` },
  ];
  return (
    <ul className="pk-ins-stats">
      {tiles.map(({ icon: Icon, label, value, hint }) => (
        <li key={label} className="pk-ins-stat">
          <Icon size={18} aria-hidden="true" />
          <span className="pk-ins-stat__label">{label}</span>
          <strong className="pk-ins-stat__value">{value}</strong>
          <span className="pk-ins-stat__hint">{hint}</span>
        </li>
      ))}
    </ul>
  );
}

/** Finishes by month, as books or pages. */
export function Rhythm({ insights, scope }) {
  const [metric, setMetric] = useState("books");
  const values = metric === "books" ? insights.monthlyBooks : insights.monthlyPages;
  const max = Math.max(...values, 1);
  const unit = metric === "books" ? "books" : "pages";
  const busiest = insights.busiestMonth;
  const note =
    scope === ALL_TIME
      ? "All years combined, month by month."
      : busiest >= 0
        ? `${MONTHS[busiest]} was your busiest month.`
        : "No finishes recorded yet.";

  return (
    <Section id="ins-rhythm" title="Reading rhythm" note={note} className="pk-ins-card--wide">
      <div className="pk-ins-toggle" role="group" aria-label="Chart measure">
        {["books", "pages"].map((key) => (
          <button key={key} type="button" className="pk-ins-toggle__btn" aria-pressed={metric === key} onClick={() => setMetric(key)}>
            {key === "books" ? "Books" : "Pages"}
          </button>
        ))}
      </div>
      <ol className="pk-ins-bars">
        {values.map((value, index) => (
          <li key={MONTHS[index]} className={index === busiest ? "pk-ins-bar pk-ins-bar--top" : "pk-ins-bar"}>
            <span className="pk-ins-bar__value">{value ? compact.format(value) : ""}</span>
            <span className="pk-ins-bar__track">
              <span className="pk-ins-bar__fill" style={{ height: `${(value / max) * 100}%` }} title={`${MONTHS[index]}: ${value} ${unit}`} />
            </span>
            <span className="pk-ins-bar__label">{MONTHS[index]}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** The covers of everything finished in the period, in the order it was finished. */
export function YearShelf({ insights, scope }) {
  const { openDetails } = useUi();
  const dateOf = (book) =>
    new Date(book.finishedAt).toLocaleDateString(undefined, scope === ALL_TIME ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" });

  return (
    <Section id="ins-shelf" title={scope === ALL_TIME ? "Everything you have finished" : `Your ${scope} in books`} note="Oldest first. Open one to see the details.">
      <ol className="pk-ins-shelf">
        {insights.finished.map((book) => (
          <li key={book.id} className="pk-ins-shelf__item">
            <button type="button" onClick={(event) => openDetails(book, event.currentTarget.querySelector(".pk-cover"))} aria-label={`Open ${book.title}`}>
              <BookCover book={book} size="md" />
              <span className="pk-ins-shelf__title" lang={langOf(book.title)}>
                {book.title}
              </span>
              <span className="pk-ins-shelf__date">{book.finishedAt ? dateOf(book) : "Undated"}</span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Top genres as ranked bars, and the writing systems of the books. */
export function Taste({ insights }) {
  const genres = insights.genres.slice(0, 6);
  const top = genres[0]?.[1] || 1;
  const total = insights.scripts.reduce((sum, script) => sum + script.count, 0) || 1;

  return (
    <>
      <Section id="ins-genres" title="What you reach for" note={genres.length ? "Genres of the books you finished." : "Add genres or tags to your books to see this."}>
        <ol className="pk-ins-rank">
          {genres.map(([name, count], index) => (
            <li key={name} className={`pk-ins-rank__row pk-ins-tone-${index % 6}`}>
              <span className="pk-ins-rank__name">{name}</span>
              <span className="pk-ins-rank__bar">
                <span style={{ width: `${(count / top) * 100}%` }} />
              </span>
              <span className="pk-ins-rank__count">{count}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="ins-scripts" title="Languages and scripts" note="Judged from the writing in each title, so every language counts.">
        <div className="pk-ins-mix" role="img" aria-label={insights.scripts.map((s) => `${s.name} ${s.count}`).join(", ")}>
          {insights.scripts.map((script, index) => (
            <span key={script.key} className={`pk-ins-tone-${index % 6}`} style={{ flexGrow: script.count / total }} />
          ))}
        </div>
        <ul className="pk-ins-legend">
          {insights.scripts.map((script, index) => (
            <li key={script.key} className={`pk-ins-tone-${index % 6}`}>
              <i aria-hidden="true" />
              {script.name}
              <b>{Math.round((script.count / total) * 100)}%</b>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

/** Rating spread and the authors you finish most. */
export function Verdicts({ insights }) {
  const max = Math.max(...insights.ratingHistogram.map((row) => row.count), 1);
  const authors = insights.authors;

  return (
    <>
      <Section id="ins-ratings" title="How you rate" note={insights.ratedCount ? `${insights.ratedCount} rated books.` : "Rate a book to see the spread."}>
        <ol className="pk-ins-hist">
          {[...insights.ratingHistogram].reverse().map(({ stars, count }) => (
            <li key={stars}>
              <span className="pk-ins-hist__stars">{stars} ★</span>
              <span className="pk-ins-hist__bar">
                {count > 0 && <span style={{ width: `${(count / max) * 100}%` }} />}
              </span>
              <span className="pk-ins-hist__count">{count}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="ins-authors" title="Authors you keep coming back to" note={authors.length ? undefined : "Nobody yet."}>
        <ol className="pk-ins-authors">
          {authors.map(([name, count], index) => (
            <li key={name}>
              <span className="pk-ins-authors__rank">{index + 1}</span>
              <span className="pk-ins-authors__name" lang={langOf(name)}>
                {name}
              </span>
              <span className="pk-ins-authors__count">{count === 1 ? "1 book" : `${count} books`}</span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

/** Superlatives, each with the cover of the book that earned it. */
export function Records({ insights }) {
  const { openDetails } = useUi();
  const { records } = insights;
  const entries = [
    records.longest && { key: "longest", label: "The longest", book: records.longest, note: `${records.longest.pages.toLocaleString()} pages` },
    records.shortest && records.shortest.id !== records.longest?.id && { key: "shortest", label: "The shortest", book: records.shortest, note: `${records.shortest.pages} pages` },
    records.topRated && { key: "top", label: "Best loved", book: records.topRated, note: `${records.topRated.rating} of 5 stars` },
    records.fastest && { key: "fast", label: "Devoured", book: records.fastest.book, note: records.fastest.days === 1 ? "Done in a day" : `Done in ${records.fastest.days} days` },
    records.slowest && records.slowest.book.id !== records.fastest?.book.id && {
      key: "slow",
      label: "Savoured",
      book: records.slowest.book,
      note: `Took ${records.slowest.days} days`,
    },
  ].filter(Boolean);
  if (!entries.length) return null;

  return (
    <Section id="ins-records" title="Records" note="The books that stand out." className="pk-ins-card--wide">
      <ul className="pk-ins-records">
        {entries.map(({ key, label, book, note }) => (
          <li key={key}>
            <button type="button" className="pk-ins-record" onClick={(event) => openDetails(book, event.currentTarget.querySelector(".pk-cover"))}>
              <BookCover book={book} size="md" />
              <span className="pk-ins-record__text">
                <span className="pk-ins-record__label">{label}</span>
                <span className="pk-ins-record__title" lang={langOf(book.title)}>
                  {book.title}
                </span>
                <span className="pk-ins-record__note">{note}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
