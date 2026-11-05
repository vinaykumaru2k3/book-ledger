import { useCallback, useEffect, useMemo, useState } from "react";
import { searchOpenLibrary } from "../../services/bookApi";
import { buildTasteProfile, pickRecommendations, planQueries } from "./recommendationsModel";

/**
 * Loads recommendations for a library. Re-runs when the library changes or
 * `refresh()` is called. `profile.bookCount` tells the UI whether they are
 * personalised or just popular picks.
 */
export function useRecommendations(books) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const profile = useMemo(() => buildTasteProfile(books), [books]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const queries = planQueries(profile);
        const results = await Promise.all(
          queries.map(async (query) => {
            try {
              return { query, docs: await searchOpenLibrary({ [query.param]: query.value }, 6) };
            } catch (e) {
              console.error(`Failed to fetch recommendations for ${query.value}:`, e);
              return { query, docs: [] };
            }
          })
        );
        if (!cancelled) setRecommendations(pickRecommendations(results, books));
      } catch (e) {
        console.error("Recommendations engine error:", e);
        if (!cancelled) setError("Failed to generate recommendations. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // `profile` is derived from `books`; `nonce` forces a reload on demand.
  }, [books, profile, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { recommendations, loading, error, refresh, profile };
}
