import React, { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { prefersReducedMotion } from "../../shared/lib/motion";

/*
 * Small, looping illustrations for the feature tiles. Each one is decorative
 * (the tile's heading and text carry the meaning) and only animates while
 * `live` is true, i.e. once the tile has scrolled into view.
 */

/** A book saved on a laptop shows up on a phone a moment later. */
export function SyncDemo({ t }) {
  return (
    <div className="pk-demo pk-demo--sync" aria-hidden="true">
      <div className="pk-demo__laptop">
        <span className="pk-demo__screen">
          <span className="pk-demo__cover pk-demo__cover--a" />
          <span className="pk-demo__cover pk-demo__cover--b" />
          <span className="pk-demo__cover pk-demo__cover--new" />
        </span>
        <span className="pk-demo__base" />
      </div>
      <span className="pk-demo__arc">
        <span className="pk-demo__packet" />
      </span>
      <div className="pk-demo__phone">
        <span className="pk-demo__cover pk-demo__cover--a" />
        <span className="pk-demo__cover pk-demo__cover--new" />
      </div>
      <span className="pk-demo__synced">
        <Check size={12} /> {t("landing.demo.synced")}
      </span>
    </div>
  );
}

const QUERY = "karvalo";

/** Types a title in Latin letters and finds the book in its own script, plus its translation. */
export function SearchDemo({ live, t }) {
  const [typed, setTyped] = useState(prefersReducedMotion() ? QUERY.length : 0);

  useEffect(() => {
    if (!live || prefersReducedMotion()) return undefined;
    let step = 0;
    const timer = setInterval(() => {
      // Type 7 letters, hold for a while with the result showing, then clear.
      step = (step + 1) % 26;
      setTyped(Math.min(step, QUERY.length));
    }, 160);
    return () => clearInterval(timer);
  }, [live]);

  const done = typed === QUERY.length;
  return (
    <div className="pk-demo pk-demo--search" aria-hidden="true">
      <div className="pk-demo__searchbox">
        <Search size={14} />
        <span className="pk-demo__query">
          {QUERY.slice(0, typed) || <span className="pk-demo__placeholder">{t("landing.demo.search")}</span>}
        </span>
        <span className="pk-demo__caret" />
      </div>
      <div className={`pk-demo__results${done ? " is-shown" : ""}`}>
        <div className="pk-demo__result">
          <span className="pk-demo__thumb" />
          <span>
            <strong lang="kn">ಕರ್ವಾಲೋ</strong>
            <small lang="kn">ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ · 1980</small>
          </span>
        </div>
        <div className="pk-demo__result pk-demo__result--dim">
          <span className="pk-demo__thumb pk-demo__thumb--b" />
          <span>
            <strong>Carvalho</strong>
            <small>English translation</small>
          </span>
        </div>
      </div>
    </div>
  );
}

const MONTHS = [3, 5, 2, 6, 4, 7, 5, 8, 6, 9, 7, 10];
const TARGET = 42;

/** A yearly count ticks up while the monthly bars grow. */
export function InsightsDemo({ live, t }) {
  const [count, setCount] = useState(prefersReducedMotion() ? TARGET : 0);

  useEffect(() => {
    if (!live || prefersReducedMotion()) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 1600, 1);
      setCount(Math.round(TARGET * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  return (
    <div className="pk-demo pk-demo--insights" aria-hidden="true">
      <div className="pk-demo__count">
        <strong>{count}</strong>
        <span>{t("landing.demo.books")}</span>
      </div>
      <div className="pk-demo__bars">
        {MONTHS.map((value, index) => (
          <span key={index} style={{ "--h": `${value * 10}%`, "--d": `${index * 60}ms` }} />
        ))}
      </div>
    </div>
  );
}

const STARS = [
  [18, 70], [40, 40], [62, 58], [88, 22], [112, 48], [136, 30], [160, 64], [184, 38], [206, 72],
];

/** Stars (your books) and the constellation drawn between them. */
export function SanctuaryDemo({ t }) {
  const path = STARS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  return (
    <div className="pk-demo pk-demo--sky" aria-hidden="true">
      <svg viewBox="0 0 224 92" className="pk-demo__constellation">
        <path d={path} pathLength="1" />
        {STARS.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 3.2 : 2.2} style={{ "--d": `${index * 140}ms` }} />
        ))}
      </svg>
      <p className="pk-demo__promise">{t("landing.demo.promise")}</p>
    </div>
  );
}
