import React, { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../../shared/lib/motion";
import { langOf } from "../../shared/lib/script";

/*
 * The hero centrepiece: an open book.
 *  - Left page: a reading-year dial, like a planisphere in an old star atlas.
 *    Each star is a finished book, labelled in its own script and placed at
 *    the month it was finished.
 *    The constellation joins them in reading order, tracing the year.
 *  - Right page: the reading ledger. The last entry is still being read; its
 *    progress fills, it is stamped finished, and its star lifts off the page,
 *    crosses the gutter and settles into its month on the dial.
 * The whole spread tilts gently toward the pointer. Decorative, so it is one
 * labelled image for assistive tech.
 */

// The dial lives in the plate's 200 x 230 coordinate space.
const CX = 100;
const CY = 108;
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Where a book sits on the dial: the angle comes from the day of the year it was finished. */
export function dialPosition(dayOfYear, radius) {
  const angle = ((-90 + (dayOfYear / 365) * 360) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
}

/** A four-point sparkle centred on (x, y). */
const sparkle = (x, y, size) =>
  `M${x} ${y - size}Q${x} ${y} ${x + size} ${y}Q${x} ${y} ${x} ${y + size}Q${x} ${y} ${x - size} ${y}Q${x} ${y} ${x} ${y - size}Z`;

// Finished books in reading order. Radii are chosen so each label gets its own row;
// labels point inward, and a dark outline lets constellation lines pass behind them.
const BOOKS = [
  { title: "\u0c95\u0cb0\u0ccd\u0cb5\u0cbe\u0cb2\u0ccb", day: 20, radius: 58, size: 3.6, label: "left" },
  { title: "\u0917\u094b\u0926\u093e\u0928", day: 70, radius: 52, size: 3.8, label: "left" },
  { title: "\u30ce\u30eb\u30a6\u30a7\u30a4\u306e\u68ee", day: 125, radius: 60, size: 4, label: "left" },
  { title: "\u0410\u043d\u043d\u0430 \u041a\u0430\u0440\u0435\u043d\u0438\u043d\u0430", day: 172, radius: 70, size: 5, label: "left" },
  { title: "\u0baa\u0bca\u0ba9\u0bcd\u0ba9\u0bbf\u0baf\u0bbf\u0ba9\u0bcd \u0b9a\u0bc6\u0bb2\u0bcd\u0bb5\u0ba9\u0bcd", day: 225, radius: 66, size: 5, label: "below" },
  { title: "Cien a\u00f1os de soledad", day: 262, radius: 50, size: 4, label: "right" },
].map((book) => ({ ...book, ...dialPosition(book.day, book.radius) }));
const NEW_BOOK = { title: "Middlemarch", ...dialPosition(314, 66), size: 5 };

/** Label anchor and offset for a star. */
const labelAt = (book, where) => {
  if (where === "left") return { x: book.x - 6, y: book.y + 2.4, anchor: "end" };
  if (where === "below") return { x: book.x + 5, y: book.y + 9, anchor: "start" };
  return { x: book.x + 6, y: book.y + 2.4, anchor: "start" };
};

const LEDGER = [
  { title: "Анна Каренина", author: "Tolstoy", date: "20 Jun" },
  { title: "பொன்னியின் செல்வன்", author: "Kalki", date: "15 Aug" },
  { title: "Cien años de soledad", author: "García Márquez", date: "22 Sep" },
];

function HeroBook({ label, t }) {
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || prefersReducedMotion()) return undefined;
    let raf = null;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const loop = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      scene.style.setProperty("--tilt-x", `${current.y.toFixed(2)}deg`);
      scene.style.setProperty("--tilt-y", `${current.x.toFixed(2)}deg`);
      raf = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.01 ? requestAnimationFrame(loop) : null;
    };
    const onMove = (event) => {
      target = { x: (event.clientX / window.innerWidth - 0.5) * 10, y: -(event.clientY / window.innerHeight - 0.5) * 8 };
      if (raf === null) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  const last = BOOKS[BOOKS.length - 1]; // the new star continues the line from here
  const r = (n) => Math.round(n * 10) / 10;
  const polar = (radius, turn) => {
    const a = ((-90 + turn * 360) * Math.PI) / 180;
    return [r(CX + radius * Math.cos(a)), r(CY + radius * Math.sin(a))];
  };

  return (
    <div className="pk-bookscene" ref={sceneRef} role="img" aria-label={label}>
      <div className="pk-openbook">
        <div className="pk-openbook__board" />
        <div className="pk-openbook__stack" />

        {/* Left page: the reading-year dial. */}
        <div className="pk-openbook__page pk-openbook__page--left">
          <p className="pk-openbook__head pk-openbook__head--sky">
            <span>{t("landing.book.sky")}</span>
            <span>MMXXVI</span>
          </p>
          <svg className="pk-atlas" viewBox="0 0 200 230" aria-hidden="true">
            {/* The dial: guide rings, the month band with week ticks, month initials. */}
            <g className="pk-atlas__grid">
              <circle cx={CX} cy={CY} r="40" />
              <circle cx={CX} cy={CY} r="60" />
            </g>
            <g className="pk-atlas__dial">
              <circle cx={CX} cy={CY} r="80" />
              <circle cx={CX} cy={CY} r="86" />
              {Array.from({ length: 52 }, (_, week) => {
                const [x1, y1] = polar(83.5, week / 52);
                const [x2, y2] = polar(86, week / 52);
                return <line key={week} x1={x1} y1={y1} x2={x2} y2={y2} />;
              })}
              {MONTHS.map((_, month) => {
                const [x1, y1] = polar(80, month / 12);
                const [x2, y2] = polar(86, month / 12);
                return <line key={month} className="pk-atlas__major" x1={x1} y1={y1} x2={x2} y2={y2} />;
              })}
            </g>
            <g className="pk-atlas__months">
              {MONTHS.map((letter, month) => {
                const [x, y] = polar(93, (month + 0.5) / 12);
                return (
                  <text key={month} x={x} y={r(y + 2)} textAnchor="middle">
                    {letter}
                  </text>
                );
              })}
            </g>
            <circle className="pk-atlas__pole" cx={CX} cy={CY} r="1.2" />

            {/* The constellation, in reading order. */}
            {BOOKS.slice(1).map((book, index) => (
              <line
                key={book.title}
                className="pk-atlas__line"
                x1={r(BOOKS[index].x)}
                y1={r(BOOKS[index].y)}
                x2={r(book.x)}
                y2={r(book.y)}
                pathLength="1"
                style={{ "--d": `${900 + index * 240}ms` }}
              />
            ))}
            <line
              className="pk-atlas__line pk-atlas__line--new"
              x1={r(last.x)}
              y1={r(last.y)}
              x2={r(NEW_BOOK.x)}
              y2={r(NEW_BOOK.y)}
              pathLength="1"
            />
            {BOOKS.map((book, index) => {
              const at = labelAt(book, book.label);
              return (
                <g key={book.title} className="pk-atlas__star" style={{ "--d": `${700 + index * 200}ms` }}>
                  <path className="pk-atlas__glyph" d={sparkle(r(book.x), r(book.y), book.size)} />
                  <text x={r(at.x)} y={r(at.y)} textAnchor={at.anchor} lang={langOf(book.title)}>
                    {book.title}
                  </text>
                </g>
              );
            })}
            <g className="pk-atlas__star pk-atlas__star--new">
              <path className="pk-atlas__glyph" d={sparkle(r(NEW_BOOK.x), r(NEW_BOOK.y), NEW_BOOK.size)} />
              <text x={r(NEW_BOOK.x + 6)} y={r(NEW_BOOK.y + 2.4)} textAnchor="start">
                {NEW_BOOK.title}
              </text>
            </g>
            <text className="pk-atlas__legend" x={CX} y="225" textAnchor="middle">
              {t("landing.book.legend")}
            </text>
          </svg>
          <span className="pk-openbook__folio pk-openbook__folio--left">i</span>
        </div>

        {/* Right page: the reading ledger. */}
        <div className="pk-openbook__page pk-openbook__page--right">
          <p className="pk-openbook__head">
            <span>{t("landing.book.ledger")}</span>
            <span>✦</span>
          </p>
          <ol className="pk-ledger">
            {LEDGER.map((row, index) => (
              <li key={row.title} className="pk-ledger__row" style={{ "--d": `${1100 + index * 150}ms` }}>
                <span className="pk-ledger__book">
                  <span className="pk-ledger__title" lang={langOf(row.title)}>
                    {row.title}
                  </span>
                  <span className="pk-ledger__author">{row.author}</span>
                </span>
                <span className="pk-ledger__date">{row.date}</span>
                <span className="pk-ledger__mark">★</span>
              </li>
            ))}
            <li className="pk-ledger__row pk-ledger__row--reading" style={{ "--d": "1550ms" }}>
              <span className="pk-ledger__book">
                <span className="pk-ledger__title">Middlemarch</span>
                <span className="pk-ledger__author">Eliot</span>
              </span>
              <span className="pk-ledger__date">
                <span className="pk-ledger__progress">
                  <i />
                </span>
                <span className="pk-ledger__today">{t("landing.book.today")}</span>
              </span>
              <span className="pk-ledger__mark pk-ledger__mark--new">★</span>
            </li>
          </ol>
          <p className="pk-openbook__note">{t("landing.book.note")}</p>
          <dl className="pk-openbook__tally">
            <div>
              <dt>{t("landing.book.books")}</dt>
              <dd>7</dd>
            </div>
            <div>
              <dt>{t("landing.book.languages")}</dt>
              <dd>7</dd>
            </div>
            <div>
              <dt>{t("landing.book.pages")}</dt>
              <dd>2,904</dd>
            </div>
          </dl>
          <span className="pk-openbook__folio">ii</span>
        </div>

        <span className="pk-openbook__ribbon" />
        <span className="pk-openbook__rise" />
      </div>
      <div className="pk-bookscene__shadow" />
    </div>
  );
}

export default HeroBook;
