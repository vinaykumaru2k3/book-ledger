/** Theme registry and the pure helpers around choosing one. */
import { DEFAULT_THEME, PALETTES, SYSTEM_CHOICES, SYSTEM_THEME } from "./palettes.js";

export { DEFAULT_THEME, SYSTEM_THEME };
export const THEME_STORAGE_KEY = "pustaka:theme";

/** What the picker lists: id, names and four swatch colours (page, card, accent, text). */
export const THEMES = PALETTES.map((p) => ({
  id: p.id,
  name: p.name,
  blurb: p.blurb,
  mode: p.mode,
  swatch: [p.bg, p.surface, p.accent, p.ink],
  themeColor: p.bg,
}));

export const isThemeChoice = (id) => id === SYSTEM_THEME || THEMES.some((t) => t.id === id);

/** The concrete theme id for a stored choice ("system" follows the device). */
export function resolveTheme(choice, systemDark) {
  if (choice === SYSTEM_THEME) return systemDark ? SYSTEM_CHOICES.dark : SYSTEM_CHOICES.light;
  return THEMES.some((t) => t.id === choice) ? choice : DEFAULT_THEME;
}

export function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(choice) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* private mode or blocked storage: the choice just will not persist locally */
  }
}
