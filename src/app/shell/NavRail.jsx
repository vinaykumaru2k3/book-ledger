import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { getCoverStyle } from "../../shared/lib/cover";
import { langOf } from "../../shared/lib/script";
import { progressFor } from "../../domain/status";
import { currentlyReading, finishedByMonth, shelvesOf } from "../../domain/library";
import { useBooks, useUi } from "../AppContext";
import { DESTINATIONS, isActiveDestination } from "../nav";
import AccountMenu from "./AccountMenu";
import NavLink from "./NavLink";

const STORAGE_KEY = "pustaka:rail-collapsed";
const GROUPS = [
  { id: "books", labelKey: "nav.groupBooks", ids: ["all", "shelves"] },
  { id: "discover", labelKey: "nav.discover", ids: ["recommendations", "topbooks", "kannada"] },
  { id: "reflect", labelKey: "nav.groupReflect", ids: ["analytics", "galaxy"] },
];
const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** A four-point sparkle, the same mark as the landing page's star dial. */
const Sparkle = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 0Q10 10 20 10Q10 10 10 20Q10 10 0 10Q10 10 10 0Z" />
  </svg>
);

function readCollapsed() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "1";
  } catch {
    /* storage blocked: fall through to the default */
  }
  return typeof window !== "undefined" && window.innerWidth < 1200; // tablets start slim
}

/**
 * Desktop sidebar, "the night shelf": a dark panel beside the paper-coloured
 * pages. Grouped destinations with a gold star that glides to the current
 * page, the books you are reading, this year's finished books as stars by
 * month, and the account menu. Collapses to a slim icon rail (remembered).
 */
function NavRail({ view, onNavigate }) {
  const { t } = useLanguage();
  const { books } = useBooks();
  const { openDetails } = useUi();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const listRef = useRef(null);
  const [marker, setMarker] = useState(null);

  const year = new Date().getFullYear();
  const reading = useMemo(() => currentlyReading(books, 3), [books]);
  const months = useMemo(() => finishedByMonth(books, year), [books, year]);
  const finishedCount = months.reduce((sum, list) => sum + list.length, 0);
  const counts = useMemo(() => ({ all: books.length, shelves: shelvesOf(books).length }), [books]);

  const toggle = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem(STORAGE_KEY, current ? "0" : "1");
      } catch {
        /* the choice still applies for this visit */
      }
      return !current;
    });
  };

  // Move the highlight to the active link (it glides there with a CSS transition).
  // The rail animates its width when it collapses or expands, and fonts can load late,
  // so the links keep moving after the first measurement: measure again whenever the
  // list or the rail changes size, and once more when the width animation ends.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = () => {
      const active = list.querySelector('[aria-current="page"]');
      const next = active ? { top: active.offsetTop, height: active.offsetHeight } : null;
      setMarker((current) => (current && next && current.top === next.top && current.height === next.height ? current : next));
    };
    measure();
    const rail = list.closest(".pk-rail");
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(list);
    if (rail) observer?.observe(rail);
    rail?.addEventListener("transitionend", measure);
    return () => {
      observer?.disconnect();
      rail?.removeEventListener("transitionend", measure);
    };
  }, [view, collapsed]);

  return (
    <nav className={`pk-rail${collapsed ? " pk-rail--collapsed" : ""}`} aria-label={t("nav.main")}>
      <div className="pk-rail__head">
        <NavLink view="all" onNavigate={onNavigate} className="pk-rail__brand" aria-label="Pustaka">
          <img src="/stack-of-books.png" alt="" width="30" height="30" />
          <span className="pk-rail__text">Pustaka</span>
        </NavLink>
        <button
          type="button"
          className="pk-rail__toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
        </button>
      </div>

      <div className="pk-rail__scroll">
        <div className="pk-rail__nav" ref={listRef}>
          {marker && (
            <span className="pk-rail__marker" style={{ transform: `translateY(${marker.top}px)`, height: marker.height }} aria-hidden="true">
              <Sparkle className="pk-rail__markerStar" />
            </span>
          )}
          {GROUPS.map((group) => {
            const items = DESTINATIONS.filter((d) => group.ids.includes(d.id));
            if (!items.length) return null;
            return (
              <div key={group.id} className="pk-rail__group">
                <p className="pk-rail__label pk-rail__text">{t(group.labelKey)}</p>
                <ul className="pk-rail__list">
                  {items.map(({ id, labelKey, shortKey, icon: Icon }) => {
                    const active = isActiveDestination(id, view);
                    const label = t(collapsed ? shortKey || labelKey : labelKey);
                    return (
                      <li key={id}>
                        <NavLink
                          view={id}
                          active={active}
                          onNavigate={onNavigate}
                          className={active ? "pk-rail__link pk-rail__link--active" : "pk-rail__link"}
                          title={collapsed ? t(labelKey) : undefined}
                        >
                          <Icon size={21} aria-hidden="true" />
                          <span className="pk-rail__text pk-rail__linkText">{label}</span>
                          {counts[id] > 0 && <span className="pk-rail__count pk-rail__text">{counts[id]}</span>}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {!collapsed && (
          <section className="pk-rail__section" aria-labelledby="rail-reading">
            <h2 id="rail-reading" className="pk-rail__label">
              {t("nav.readingNow")}
            </h2>
            {reading.length ? (
              <ul className="pk-rail__reading">
                {reading.map((book) => {
                  const percent = progressFor(book);
                  return (
                    <li key={book.id}>
                      <button
                        type="button"
                        className="pk-rail__book"
                        onClick={() => openDetails(book)}
                        aria-label={t("nav.openBook", { title: book.title, percent })}
                      >
                        <span className="pk-rail__spine" style={getCoverStyle(`${book.title}${book.author || ""}`)} aria-hidden="true" />
                        <span className="pk-rail__bookText" aria-hidden="true">
                          <span className="pk-rail__bookTitle" lang={langOf(book.title)}>
                            {book.title}
                          </span>
                          <span className="pk-rail__progress">
                            <i style={{ width: `${percent}%` }} />
                          </span>
                        </span>
                        <span className="pk-rail__percent" aria-hidden="true">
                          {percent}%
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="pk-rail__empty">{t("nav.noneReading")}</p>
            )}
          </section>
        )}

        {!collapsed && (
          <NavLink view="analytics" onNavigate={onNavigate} className="pk-rail__year" aria-label={t("nav.yearStarsLabel", { year, count: finishedCount })}>
            <span className="pk-rail__label" aria-hidden="true">
              {t("nav.yearStars", { year })}
            </span>
            <span className="pk-rail__months" aria-hidden="true">
              {months.map((list, month) => (
                <span key={month} className="pk-rail__month">
                  <span className="pk-rail__monthStars">
                    {list.slice(0, 4).map((book) => (
                      <Sparkle key={book.id} className="pk-rail__dot" />
                    ))}
                  </span>
                  <span className="pk-rail__monthLetter">{MONTH_INITIALS[month]}</span>
                </span>
              ))}
            </span>
            <span className="pk-rail__yearCount" aria-hidden="true">
              {t("nav.yearStarsCount", { count: finishedCount })}
            </span>
          </NavLink>
        )}
      </div>

      <div className="pk-rail__foot">
        <AccountMenu showName={!collapsed} />
      </div>
    </nav>
  );
}

export default NavRail;
