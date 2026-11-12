/**
 * Pure helpers behind the library dashboard, kept free of React so they are
 * easy to test.
 */
export { goalPace, scriptMix, pileHeightCm } from "../../../shared/lib/readingStats";

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
