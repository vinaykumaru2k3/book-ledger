import React, { createContext, useContext, useEffect } from "react";
import { translate } from "./translate";

const LanguageContext = createContext(null);
const VALUE = { lang: "en", t: translate };

/** Provides the text helper `t` and keeps `<html lang>` set to English. */
export function LanguageProvider({ children }) {
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);
  return <LanguageContext.Provider value={VALUE}>{children}</LanguageContext.Provider>;
}

/** `const { t } = useLanguage();` */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
