/**
 * Pure helpers behind the library dashboard, kept free of React so they are
 * easy to test.
 */
import { langOf } from "../../../shared/lib/script";

/** Part of the day for the greeting. */
export function partOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

/** First name (or the part of the email before @) for a friendly greeting. */
export function firstNameOf(user) {
  const raw = user?.displayName || user?.email?.split("@")[0] || "";
  const first = raw.trim().split(/\s+/)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

/**
 * How a yearly goal is going: books still to read, and whether the reader is
 * ahead of or behind an even pace through the year.
 */
export function goalPace(finished, goal, date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear() + 1, 0, 1);
  const yearFraction = (date - start) / (end - start);
  const expected = goal * yearFraction;
  const delta = Math.round((finished - expected) * 10) / 10;
  return {
    remaining: Math.max(goal - finished, 0),
    percent: goal > 0 ? Math.min(Math.round((finished / goal) * 100), 100) : 0,
    status: finished >= goal ? "done" : delta >= -0.5 ? "onTrack" : "behind",
    behindBy: Math.max(Math.ceil(expected - finished), 0),
  };
}

const SCRIPT_NAMES = {
  latin: "Latin",
  kn: "Kannada",
  hi: "Devanagari",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
  gu: "Gujarati",
  pa: "Gurmukhi",
  ar: "Arabic",
  ja: "Japanese",
  ko: "Hangul",
  zh: "Chinese",
  ru: "Cyrillic",
  el: "Greek",
};

/** The writing systems of the books' titles, most common first. */
export function scriptMix(books) {
  const counts = new Map();
  books.forEach((book) => {
    const key = langOf(book.title || "") || "latin";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([key, count]) => ({ key, name: SCRIPT_NAMES[key] || key, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Roughly how tall a pile of paper this many pages makes (about 0.05 mm a page), in centimetres. */
export function pileHeightCm(pages) {
  return Math.round(pages * 0.005 * 10) / 10;
}
