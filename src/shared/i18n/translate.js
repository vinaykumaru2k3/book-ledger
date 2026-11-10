/**
 * Text lookup, kept free of React so it can be tested directly.
 *
 * The app is English only. All user-facing text still lives in one flat
 * dictionary (`en.js`, keyed by dotted names like "nav.library"), so wording
 * is easy to find and change in one place. A missing key falls back to the
 * key itself, so a gap shows up as readable text and never crashes.
 * Values may contain {placeholders} filled from `vars`.
 */
import en from "./en";

export function translate(key, vars) {
  const template = en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
