import React from "react";
import { ArrowLeft } from "lucide-react";
import LanguageToggle from "../../shared/pk/LanguageToggle";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import AuthCard from "./AuthCard";

/** Sign-in screen: a slim bar (back link, language) above the sign-in card. */
function AuthScreen({ onBackToLanding, ...cardProps }) {
  const { t } = useLanguage();

  return (
    <div className="pk-auth">
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
        <div className="pk-auth__brand" aria-hidden="true">
          <img src="/stack-of-books.png" alt="" width="56" height="56" />
          <span>Pustaka</span>
        </div>
        <AuthCard {...cardProps} />
      </main>
    </div>
  );
}

export default AuthScreen;
