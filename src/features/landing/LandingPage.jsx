import React from "react";
import { ArrowRight, BarChart3, Cloud, Search, ShieldCheck } from "lucide-react";
import BookSpine from "../../shared/pk/BookSpine";
import Button from "../../shared/pk/Button";
import Card from "../../shared/pk/Card";
import LanguageToggle from "../../shared/pk/LanguageToggle";
import { useLanguage } from "../../shared/i18n/LanguageContext";

// Decorative sample books for the hero shelf (not real data).
const SAMPLE_SHELF = [
  { id: "a", title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", pages: 200, status: "done", favorite: true },
  { id: "b", title: "Dune", author: "Frank Herbert", pages: 412, status: "done" },
  { id: "c", title: "ಸಂಸ್ಕಾರ", author: "ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ", pages: 150, status: "reading" },
  { id: "d", title: "Emma", author: "Jane Austen", pages: 474, status: "reading" },
  { id: "e", title: "The Hobbit", author: "J. R. R. Tolkien", pages: 310, status: "want" },
  { id: "f", title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು", author: "ಕೆ. ಶಿವರಾಮ ಕಾರಂತ", pages: 180, status: "want", favorite: true },
  { id: "g", title: "1984", author: "George Orwell", pages: 328, status: "done" },
  { id: "h", title: "Kim", author: "Rudyard Kipling", pages: 336, status: "want" },
];

const FEATURES = [
  { icon: Cloud, key: "f1" },
  { icon: Search, key: "f2" },
  { icon: BarChart3, key: "f3" },
  { icon: ShieldCheck, key: "f4" },
];

/** The public front page: a hero with a shelf of books, four reasons to join, and a call to action. */
function LandingPage({ onEnter }) {
  const { t } = useLanguage();

  return (
    <div className="pk-landing">
      <a className="pk-skip" href="#main">
        {t("nav.skipToContent")}
      </a>

      <header className="pk-landing__bar">
        <span className="pk-landing__brand" aria-label={t("landing.nav")}>
          <img src="/stack-of-books.png" alt="" width="36" height="36" />
          <span>Pustaka</span>
        </span>
        <div className="pk-landing__barActions">
          <LanguageToggle />
          <Button onClick={onEnter}>{t("action.signIn")}</Button>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="pk-hero">
          <div className="pk-hero__text">
            <p className="pk-kicker">{t("landing.kicker")}</p>
            <h1 className="pk-hero__title">
              {t("landing.titleA")}
              <br />
              <em>{t("landing.titleB")}</em>
            </h1>
            <p className="pk-hero__sub">{t("landing.sub")}</p>
            <Button variant="primary" size="lg" onClick={onEnter}>
              {t("landing.cta")}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>

          <div className="pk-heroshelf" role="img" aria-label={t("landing.shelfLabel")}>
            <div className="pk-heroshelf__books">
              {SAMPLE_SHELF.map((book) => (
                <BookSpine key={book.id} book={book} />
              ))}
            </div>
            <div className="pk-heroshelf__plank" />
          </div>
        </section>

        <section className="pk-features" aria-labelledby="features-title">
          <h2 id="features-title" className="pk-features__title">
            {t("landing.featuresTitle")}
          </h2>
          <ul className="pk-features__grid">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li key={key}>
                <Card className="pk-feature">
                  <span className="pk-feature__icon" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h3>{t(`landing.${key}.title`)}</h3>
                  <p>{t(`landing.${key}.body`)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="pk-band">
          <div>
            <h2>{t("landing.band.title")}</h2>
            <p>{t("landing.band.body")}</p>
          </div>
          <Button variant="primary" size="lg" onClick={onEnter}>
            {t("landing.band.cta")}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </section>
      </main>

      <footer className="pk-landing__footer">
        <p>{t("landing.footer", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}

export default LandingPage;
