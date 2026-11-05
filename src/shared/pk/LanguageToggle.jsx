import React from "react";
import { LANGUAGES } from "../i18n/translate";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * English / ಕನ್ನಡ switch. Renders nothing while the Kannada UI is not enabled
 * for this build (see i18n/config.js), so production users never see it early.
 */
function LanguageToggle() {
  const { lang, setLang, t, canSwitch } = useLanguage();
  if (!canSwitch) return null;

  return (
    <div className="pk-lang" role="group" aria-label={t("language.label")}>
      {Object.entries(LANGUAGES).map(([code, info]) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={lang === code ? "pk-lang__btn pk-lang__btn--active" : "pk-lang__btn"}
          aria-pressed={lang === code}
          aria-label={t("language.switchTo", { language: info.label })}
          onClick={() => setLang(code)}
        >
          {info.short}
        </button>
      ))}
    </div>
  );
}

export default LanguageToggle;
