import React, { useRef } from "react";
import { ArrowDown, ArrowRight, BookOpen, Flame, Plus } from "lucide-react";
import StarField from "../../shared/pk/StarField";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useInView } from "../../shared/lib/motion";
import CoverMarquee from "./CoverMarquee";
import HeroBook from "./HeroBook";
import ScrollStatement from "./ScrollStatement";
import { InsightsDemo, SanctuaryDemo, SearchDemo, SyncDemo } from "./FeatureDemos";

const FEATURES = [
  { key: "f1", Demo: SyncDemo, size: "wide" },
  { key: "f2", Demo: SearchDemo, size: "" },
  { key: "f3", Demo: InsightsDemo, size: "" },
  { key: "f4", Demo: SanctuaryDemo, size: "wide" },
];

function FeatureTile({ feature, index, t }) {
  const ref = useRef(null);
  const live = useInView(ref);
  const { key, Demo, size } = feature;
  return (
    <li
      ref={ref}
      className={`pk-tile3 ${size ? `pk-tile3--${size}` : ""} ${live ? "is-live" : ""}`}
      style={{ "--i": index }}
    >
      <div className="pk-tile3__demo">
        <Demo live={live} t={t} />
      </div>
      <div className="pk-tile3__text">
        <h3>{t(`landing.${key}.title`)}</h3>
        <p>{t(`landing.${key}.body`)}</p>
      </div>
    </li>
  );
}

function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const shown = useInView(ref);
  return (
    <Tag ref={ref} className={`pk-reveal ${shown ? "is-shown" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * The public front page, set in a lamp-lit reading room at night:
 * drifting letters, a 3D book that opens itself, covers sliding past,
 * feature tiles with live demos, and a statement that lights up as you scroll.
 */
function LandingPage({ onEnter }) {
  const { t } = useLanguage();

  const chips = [
    <>
      <BookOpen size={14} />
      <span>
        <b lang="kn">ಕರ್ವಾಲೋ</b>
        <i className="pk-chip__bar" style={{ "--p": "64%" }} />
      </span>
    </>,
    <>
      <Flame size={14} />
      <span>{t("landing.demo.streak", { days: 12 })}</span>
    </>,
    <>
      <Plus size={14} />
      <span>{t("landing.demo.added", { title: "ノルウェイの森" })}</span>
    </>,
  ];

  return (
    <div className="pk-landing">
      <a className="pk-skip" href="#main">
        {t("nav.skipToContent")}
      </a>

      <header className="pk-landing__bar">
        <span className="pk-landing__brand" aria-label={t("landing.nav")}>
          <img src="/stack-of-books.png" alt="" width="32" height="32" />
          <span>Pustaka</span>
        </span>
        <div className="pk-landing__barActions">
          <button type="button" className="pk-ghostbtn" onClick={onEnter}>
            {t("action.signIn")}
          </button>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="pk-hero">
          <StarField className="pk-hero__field" />
          <div className="pk-hero__inner">
            <div className="pk-hero__text">
              <p className="pk-hero__kicker">
                <span className="pk-hero__dot" aria-hidden="true" />
                {t("landing.kicker")}
              </p>
              <h1 className="pk-hero__title">
                <span className="pk-hero__line">{t("landing.titleA")}</span>{" "}
                <em className="pk-hero__line pk-hero__line--gold">{t("landing.titleB")}</em>
              </h1>
              <p className="pk-hero__sub">{t("landing.sub")}</p>
              <div className="pk-hero__actions">
                <button type="button" className="pk-solidbtn" onClick={onEnter}>
                  <span>{t("landing.cta")}</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <a className="pk-hero__explore" href="#features">
                  {t("landing.explore")}
                  <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
            <HeroBook label={t("landing.bookLabel")} chips={chips} />
          </div>
          <div className="pk-hero__fade" aria-hidden="true" />
        </section>

        <CoverMarquee />

        <section id="features" className="pk-bento" aria-labelledby="features-title">
          <Reveal as="h2" id="features-title" className="pk-bento__title">
            {t("landing.featuresTitle")}
          </Reveal>
          <ul className="pk-bento__grid">
            {FEATURES.map((feature, index) => (
              <FeatureTile key={feature.key} feature={feature} index={index} t={t} />
            ))}
          </ul>
        </section>

        <section className="pk-statementwrap">
          <ScrollStatement text={t("landing.statement")} />
        </section>

        <section className="pk-finale">
          <Reveal className="pk-finale__inner">
            <h2>{t("landing.band.title")}</h2>
            <p>{t("landing.band.body")}</p>
            <button type="button" className="pk-solidbtn" onClick={onEnter}>
              <span>{t("landing.band.cta")}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </Reveal>
        </section>
      </main>

      <footer className="pk-landing__footer">
        <p>{t("landing.footer", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}

export default LandingPage;
