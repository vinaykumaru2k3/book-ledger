import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Info, Plus, Shuffle, Sparkles, Star, X } from "lucide-react";
import BookCover from "../../shared/pk/BookCover";
import { langOf } from "../../shared/lib/script";
import { useBooks } from "../../app/AppContext";
import { useDiscoverActions } from "./useDiscoverActions";
import { useRecommendations } from "./useRecommendations";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/** Rating and how many readers logged the book, when the catalogue knows them. */
function Signals({ item }) {
  if (!item.rating && !item.readers) return null;
  return (
    <span className="pk-rec__signals">
      {item.rating > 0 && (
        <span className="pk-rec__rating" aria-label={`Rated ${item.rating} out of 5`}>
          <Star size={12} fill="currentColor" aria-hidden="true" />
          {item.rating.toFixed(1)}
        </span>
      )}
      {item.readers > 0 && <span>{compact.format(item.readers)} readers</span>}
    </span>
  );
}

/** A recommendation on a themed shelf. */
function RecCard({ item, onAdd, onDetails, onDismiss }) {
  return (
    <article className="pk-rec__card">
      <button type="button" className="pk-rec__cover" onClick={() => onDetails(item)} aria-label={`Details for ${item.title}`}>
        <BookCover book={item} size="fluid" />
      </button>
      <button type="button" className="pk-rec__dismiss" onClick={() => onDismiss(item.id)} aria-label={`Not for me: ${item.title}`} title="Not for me">
        <X size={14} aria-hidden="true" />
      </button>
      <h4 className="pk-rec__title" lang={langOf(item.title)}>
        {item.title}
      </h4>
      <p className="pk-rec__author" lang={langOf(item.primaryAuthor)}>
        {item.primaryAuthor}
        {item.publishedYear ? ` · ${item.publishedYear}` : ""}
      </p>
      <Signals item={item} />
      <button type="button" className="pk-rec__add" onClick={() => onAdd(item)}>
        <Plus size={14} aria-hidden="true" />
        Want to read
      </button>
    </article>
  );
}

/** One themed, horizontally scrolling shelf of recommendations. */
function RecRow({ row, actions }) {
  const track = useRef(null);
  const scroll = (direction) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.85, behavior: "smooth" });
  const title = row.kind === "author" ? `More by ${row.label}` : row.kind === "language" || row.kind === "catalogue" ? `In ${row.label}` : row.label;
  const subtitle = row.kind === "catalogue" ? "Recently catalogued books" : row.reason;

  return (
    <section className="pk-rec__row" aria-label={title}>
      <header className="pk-rec__rowHead">
        <div>
          <h3 className="pk-rec__rowTitle" lang={langOf(row.label)}>
            {title}
          </h3>
          <p className="pk-rec__rowWhy">
            {row.inspiringBook && (
              <span className="pk-rec__rowThumb" aria-hidden="true">
                <BookCover book={row.inspiringBook} size="fluid" />
              </span>
            )}
            {subtitle}
          </p>
        </div>
        {row.items.length > 3 && (
          <div className="pk-rec__arrows">
            <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} back`}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} forward`}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </header>
      <div className="pk-rec__track" ref={track}>
        {row.items.map((item) => (
          <RecCard key={item.id} item={item} {...actions} />
        ))}
      </div>
    </section>
  );
}

/** The single best match, large. */
function TopPick({ item, actions }) {
  return (
    <section className="pk-toppick" aria-labelledby="toppick-title">
      <button type="button" className="pk-toppick__cover" onClick={() => actions.onDetails(item)} aria-label={`Details for ${item.title}`}>
        <BookCover book={item} size="fluid" />
      </button>
      <div className="pk-toppick__body">
        <p className="pk-toppick__label">
          <Sparkles size={14} aria-hidden="true" />
          Top pick for you
        </p>
        <h3 id="toppick-title" className="pk-toppick__title" lang={langOf(item.title)}>
          {item.title}
        </h3>
        <p className="pk-toppick__author" lang={langOf(item.author)}>
          {item.author}
          {item.publishedYear ? ` · ${item.publishedYear}` : ""}
          {item.pages ? ` · ${item.pages} pages` : ""}
        </p>
        <Signals item={item} />
        <p className="pk-toppick__why">
          {item.inspiringBook && (
            <span className="pk-rec__rowThumb" aria-hidden="true">
              <BookCover book={item.inspiringBook} size="fluid" />
            </span>
          )}
          {item.reason}
        </p>
        <div className="pk-toppick__actions">
          <button type="button" className="pk-toppick__primary" onClick={() => actions.onAdd(item)}>
            <Plus size={16} aria-hidden="true" />
            Add to Want to read
          </button>
          <button type="button" className="pk-toppick__ghost" onClick={() => actions.onDetails(item)}>
            <Info size={16} aria-hidden="true" />
            Details
          </button>
          <button type="button" className="pk-toppick__ghost" onClick={() => actions.onDismiss(item.id)}>
            <X size={16} aria-hidden="true" />
            Not for me
          </button>
        </div>
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="pk-rec__skeleton" aria-hidden="true">
      <div className="pk-toppick pk-toppick--ghost" />
      {[0, 1].map((row) => (
        <div key={row} className="pk-rec__row">
          <div className="pk-rec__ghostTitle" />
          <div className="pk-rec__track">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="pk-rec__ghostCard" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** "For you": picks from your taste, explained, as a top pick and themed shelves. */
function Recommendations() {
  const { books } = useBooks();
  const { groups, loading, error, refresh, dismiss, profile } = useRecommendations(books);
  const { quickAdd, viewDetails } = useDiscoverActions();
  const actions = { onAdd: quickAdd, onDetails: viewDetails, onDismiss: dismiss };
  const personal = profile.bookCount > 0;
  const tasteAuthors = profile.authors.slice(0, 3).map((a) => a.name);
  const tasteGenres = profile.genres.slice(0, 3).map((g) => g.name);
  const languages = ["English", ...profile.scripts.map((s) => s.name)];

  return (
    <div className="pk-recs">
      <section className="pk-rechero" aria-labelledby="rechero-title">
        <div className="pk-rechero__text">
          <p className="pk-rechero__kicker">{personal ? `Based on ${profile.bookCount} books on your shelves` : "Start with what readers love"}</p>
          <h2 id="rechero-title" className="pk-rechero__title">
            Picked <em>for you</em>
          </h2>
          {personal ? (
            <div className="pk-taste" aria-label="Your reading taste">
              {tasteAuthors.length > 0 && (
                <p>
                  <span className="pk-taste__label">You love</span>
                  {tasteAuthors.map((name) => (
                    <span key={name} className="pk-taste__chip" lang={langOf(name)}>
                      {name}
                    </span>
                  ))}
                </p>
              )}
              {tasteGenres.length > 0 && (
                <p>
                  <span className="pk-taste__label">Into</span>
                  {tasteGenres.map((name) => (
                    <span key={name} className="pk-taste__chip pk-taste__chip--genre">
                      {name}
                    </span>
                  ))}
                </p>
              )}
              <p>
                <span className="pk-taste__label">Reading in</span>
                {languages.map((name) => (
                  <span key={name} className="pk-taste__chip pk-taste__chip--lang">
                    {name}
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <p className="pk-rechero__sub">Add and rate a few books, and these picks will follow your taste.</p>
          )}
        </div>
        <button type="button" className="pk-rechero__shuffle" onClick={refresh} disabled={loading}>
          <Shuffle size={16} aria-hidden="true" className={loading ? "pk-spin" : ""} />
          {loading ? "Finding books…" : "Shuffle picks"}
        </button>
      </section>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="pk-rec__message" role="alert">
          <p>{error}</p>
          <button type="button" className="pk-toppick__primary" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : !groups.top ? (
        <div className="pk-rec__message">
          <Sparkles size={22} aria-hidden="true" />
          <p>No new picks right now. Shuffle for a fresh set.</p>
        </div>
      ) : (
        <>
          <TopPick item={groups.top} actions={actions} />
          {groups.rows.map((row) => (
            <RecRow key={row.key} row={row} actions={actions} />
          ))}
        </>
      )}
    </div>
  );
}

export default Recommendations;
