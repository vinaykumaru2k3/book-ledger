import { useEffect, useState } from "react";
import { searchVolumes } from "../../../services/bookApi";

const MIN_QUERY_LENGTH = 3;
// Debounce hard: Google Books answers rapid-fire queries with HTTP 429.
const DEBOUNCE_MS = 750;

function describeError(err) {
  if (!navigator.onLine) return "Search failed: You are offline. Check your internet connection.";
  return `Search failed: ${err.message || "Network issue"}`;
}

/**
 * Debounced catalogue search for the add-book form.
 * Returns the results, a loading flag and a user-readable error (or "").
 */
export function useBookSearch(query, type) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError("");
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const volumes = await searchVolumes(text, type);
        if (cancelled) return;
        setResults(volumes);
        setError(volumes.length ? "" : "No matching books found.");
      } catch (err) {
        if (cancelled) return;
        console.error("Search failed:", err);
        setResults([]);
        setError(describeError(err));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, type]);

  return { results, searching, error };
}
