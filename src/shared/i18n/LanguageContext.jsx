import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KANNADA_UI_ENABLED } from "./config";
import { DEFAULT_LANGUAGE, isLanguage, translate } from "./translate";

const STORAGE_KEY = "pustaka:language";
const LanguageContext = createContext(null);

function readInitialLanguage() {
  if (!KANNADA_UI_ENABLED) return DEFAULT_LANGUAGE;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (isLanguage(fromUrl)) return fromUrl;
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE; // storage or URL access blocked
  }
}

/** Holds the UI language, keeps `<html lang>` in sync, and remembers the choice. */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!isLanguage(next) || !KANNADA_UI_ENABLED) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice still applies for this visit */
    }
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars), canSwitch: KANNADA_UI_ENABLED }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** `const { t, lang, setLang, canSwitch } = useLanguage();` */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
