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
 * Sign-in screen, set in the same night-time reading room as the landing page:
 * the same navigation bar and drifting letters, a short pitch with rotating
 * lines and a fan of books, and the sign-in card beside it.
 * On phones the pitch shrinks to a title above the card.
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
      <GlyphField className="pk-auth__field" density={0.00008} />

      <header className="pk-landing__bar pk-auth__bar">
        <span className="pk-landing__brand">
          <img src="/stack-of-books.png" alt="" width="32" height="32" />
          <span>Pustaka</span>
        </span>
        <div className="pk-landing__barActions">
          <LanguageToggle />
          {onBackToLanding && (
            <button type="button" className="pk-ghostbtn" onClick={onBackToLanding}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{t("auth.back")}</span>
            </button>
          )}
        </div>
      </header>

      <main className="pk-auth__main">
        <div className="pk-auth__pitch">
          <p className="pk-auth__panelTitle">{t("auth.panelTitle")}</p>
          <p className="pk-auth__lines" aria-hidden="true">
            {LINES.map((key, index) => (
              <span key={key} className={`pk-auth__line${index === line ? " is-on" : ""}`}>
                {t(key)}
              </span>
            ))}
          </p>
          <div className="pk-auth__stack" aria-hidden="true">
            {STACK.map(([title, author], index) => (
              <MiniCover key={title} title={title} author={author} variant={index} />
            ))}
          </div>
        </div>

        <AuthCard {...cardProps} />
      </main>
    </div>
  );
}

export default AuthScreen;
