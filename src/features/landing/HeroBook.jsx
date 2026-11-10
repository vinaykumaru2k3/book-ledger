import React, { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../../shared/lib/motion";
import { langOf } from "../../shared/lib/script";

/*
 * The hero centrepiece: an open book.
 *  - Left page: a star-atlas plate. Every star is a finished book, labelled in
 *    its own script, joined into a constellation that draws itself.
 *  - Right page: the reading ledger. The last entry is still being read; its
 *    progress fills, it is marked finished, and its star lifts off the page,
 *    crosses the gutter and settles into the constellation.
 * The whole spread tilts gently toward the pointer. Decorative, so it is one
 * labelled image for assistive tech.
 */

// Star positions are in the plate's 200 × 230 coordinate space.
const STARS = [
  { x: 30, y: 44, title: "ಕರ್ವಾಲೋ" },
  { x: 84, y: 80, title: "गोदान" },
  { x: 38, y: 142, title: "ノルウェイの森" },
  { x: 124, y: 120, title: "Анна Каренина" },
  { x: 150, y: 178, title: "பொன்னியின் செல்வன்", anchor: "end" },
  { x: 68, y: 206, title: "Cien años de soledad" },
];
const LINES = [
  [0, 1],
  [1, 3],
  [3, 4],
  [4, 5],
  [5, 2],
  [2, 1],
];
const NEW_STAR = { x: 166, y: 56, title: "Middlemarch" };

const LEDGER = [
  { title: "ಕರ್ವಾಲೋ", author: "Tejasvi", date: "12 Jan" },
  { title: "गोदान", author: "Premchand", date: "3 Mar" },
  { title: "ノルウェイの森", author: "Murakami", date: "28 Apr" },
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

  const last = STARS[3]; // the new star joins the constellation here

  return (
    <div className="pk-bookscene" ref={sceneRef} role="img" aria-label={label}>
      <div className="pk-openbook">
        <div className="pk-openbook__board" />
        <div className="pk-openbook__stack" />

        {/* Left page: the star atlas. */}
        <div className="pk-openbook__page pk-openbook__page--left">
          <p className="pk-openbook__head pk-openbook__head--sky">
            <span>{t("landing.book.sky")}</span>
            <span>MMXXVI</span>
          </p>
          <svg className="pk-atlas" viewBox="0 0 200 230" aria-hidden="true">
            <g className="pk-atlas__grid">
              <circle cx="100" cy="115" r="48" />
              <circle cx="100" cy="115" r="86" />
              <line x1="100" y1="10" x2="100" y2="220" />
              <line x1="8" y1="115" x2="192" y2="115" />
            </g>
            {LINES.map(([a, b], index) => (
              <line
                key={`${a}-${b}`}
                className="pk-atlas__line"
                x1={STARS[a].x}
                y1={STARS[a].y}
                x2={STARS[b].x}
                y2={STARS[b].y}
                pathLength="1"
                style={{ "--d": `${900 + index * 220}ms` }}
              />
            ))}
            <line
              className="pk-atlas__line pk-atlas__line--new"
              x1={last.x}
              y1={last.y}
              x2={NEW_STAR.x}
              y2={NEW_STAR.y}
              pathLength="1"
            />
            {STARS.map((star, index) => (
              <g key={star.title} className="pk-atlas__star" style={{ "--d": `${700 + index * 160}ms` }}>
                <circle cx={star.x} cy={star.y} r="2.6" />
                <text
                  x={star.anchor === "end" ? star.x - 5 : star.x + 5}
                  y={star.y + 2.4}
                  textAnchor={star.anchor || "start"}
                  lang={langOf(star.title)}
                >
                  {star.title}
                </text>
              </g>
            ))}
            <g className="pk-atlas__star pk-atlas__star--new">
              <circle cx={NEW_STAR.x} cy={NEW_STAR.y} r="3.2" />
              <text x={NEW_STAR.x - 4} y={NEW_STAR.y - 7} textAnchor="end">
                {NEW_STAR.title}
              </text>
            </g>
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
