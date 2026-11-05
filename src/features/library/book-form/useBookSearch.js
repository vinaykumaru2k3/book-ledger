import { useEffect, useState } from "react";
import { searchVolumes } from "../../../services/bookApi";

const MIN_QUERY_LENGTH = 3;
// Debounce hard: Google Books answers rapid-fire queries with HTTP 429.
const DEBOUNCE_MS = 750;

/**
 * Debounced catalogue search for the add-book form.
 *
 * Returns the results, a loading flag, and `problem`: `null`, or one of
 * "none" (no matches), "offline" or "failed". The component turns that into
 * a translated message, so this hook holds no user-facing text.
 */
export function useBookSearch(query, type) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setProblem(null);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setProblem(null);
      try {
        const volumes = await searchVolumes(text, type);
        if (cancelled) return;
        setResults(volumes);
        setProblem(volumes.length ? null : "none");
      } catch (err) {
        if (cancelled) return;
        console.error("Search failed:", err);
        setResults([]);
        setProblem(navigator.onLine ? "failed" : "offline");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, type]);

  return { results, searching, problem };
}
