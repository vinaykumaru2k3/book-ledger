import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import GlyphField from "../../shared/pk/GlyphField";
import LanguageToggle from "../../shared/pk/LanguageToggle";
import MiniCover from "../../shared/pk/MiniCover";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { prefersReducedMotion } from "../../shared/lib/motion";
import AuthCard from "./AuthCard";

const LINES = ["auth.line1", "auth.line2", "auth.line3"];
const STACK = [
  ["ಕರ್ವಾಲೋ", "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ"],
  ["Middlemarch", "George Eliot"],
  ["ಪರ್ವ", "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ"],
];

/**
 * Sign-in screen, split in two: a night-time reading-room panel (drifting
 * letters, rotating lines, a fan of books) and the sign-in card on paper.
 * On phones the panel becomes a short header above the card.
 */
function AuthScreen({ onBackToLanding, ...cardProps }) {
  const { t } = useLanguage();
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const timer = setInterval(() => setLine((current) => (current + 1) % LINES.length), 3800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pk-auth">
      <aside className="pk-auth__panel">
        <GlyphField density={0.00009} />
        <span className="pk-auth__brand">
          <img src="/stack-of-books.png" alt="" width="32" height="32" />
          <span>Pustaka</span>
        </span>

        <div className="pk-auth__pitch">
          <p className="pk-auth__panelTitle">
            <em>{t("auth.panelTitle")}</em>
          </p>
          <p className="pk-auth__lines" aria-hidden="true">
            {LINES.map((key, index) => (
              <span key={key} className={`pk-auth__line${index === line ? " is-on" : ""}`}>
                {t(key)}
              </span>
            ))}
          </p>
        </div>

        <div className="pk-auth__stack" aria-hidden="true">
          {STACK.map(([title, author], index) => (
            <MiniCover key={title} title={title} author={author} variant={index} />
          ))}
        </div>
      </aside>

      <div className="pk-auth__side">
        <header className="pk-auth__bar">
          {onBackToLanding ? (
            <button type="button" className="pk-linkbtn" onClick={onBackToLanding}>
              <ArrowLeft size={14} aria-hidden="true" />
              {t("auth.back")}
            </button>
          ) : (
            <span />
          )}
          <LanguageToggle />
        </header>

        <main className="pk-auth__main">
          <AuthCard {...cardProps} />
        </main>
      </div>
    </div>
  );
}

export default AuthScreen;
