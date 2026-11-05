/**
 * Translation lookup, kept free of React so it can be tested directly.
 *
 * Dictionaries are flat objects keyed by dotted names ("nav.library"). A
 * missing Kannada key falls back to English, and a missing English key falls
 * back to the key itself, so a gap shows up as readable text and never crashes.
 * Values may contain {placeholders} filled from `vars`.
 */
import en from "./en";
import kn from "./kn";

export const LANGUAGES = {
  en: { label: "English", short: "EN", dictionary: en },
  kn: { label: "ಕನ್ನಡ", short: "ಕ", dictionary: kn },
};

export const DEFAULT_LANGUAGE = "en";

export function isLanguage(value) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, value);
}

export function translate(lang, key, vars) {
  const dictionary = (LANGUAGES[lang] || LANGUAGES[DEFAULT_LANGUAGE]).dictionary;
  const template = dictionary[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
