import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadThemePref, saveThemePref } from "../../services/preferences";
import { useAuth } from "../../app/AppContext";
import { DEFAULT_THEME, THEMES, isThemeChoice, readStoredTheme, resolveTheme, writeStoredTheme } from "./themes";

const fallback = { choice: DEFAULT_THEME, active: DEFAULT_THEME, setChoice() {}, setPreview() {} };
const ThemeContext = createContext(fallback);

/** The current theme choice. Safe without a provider (tests, isolated components). */
export const useTheme = () => useContext(ThemeContext);

const prefersDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

/** Applies the theme to <html>, follows the device for "System", and syncs the choice to the user's profile. */
export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [choice, setChoiceState] = useState(() => readStoredTheme() || DEFAULT_THEME);
  const [preview, setPreview] = useState(null);
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Adopt the choice saved on the account when someone signs in (e.g. on a new device).
  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    loadThemePref(uid)
      .then((saved) => {
        if (cancelled || !isThemeChoice(saved)) return;
        setChoiceState(saved);
        writeStoredTheme(saved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const active = resolveTheme(preview || choice, systemDark);

  useEffect(() => {
    document.documentElement.dataset.theme = active;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES.find((t) => t.id === active)?.themeColor ?? "#f6f7fb");
  }, [active]);

  const setChoice = useCallback(
    (next) => {
      if (!isThemeChoice(next)) return;
      setChoiceState(next);
      setPreview(null);
      writeStoredTheme(next);
      if (uid) saveThemePref(uid, next).catch(() => {});
    },
    [uid],
  );

  const value = useMemo(() => ({ choice, active, setChoice, setPreview }), [choice, active, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
