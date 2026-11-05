import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isInLibrary } from "../../domain/library";
import { searchOpenLibrary } from "../../services/bookApi";
import { buildTasteProfile, pickRecommendations, planQueries } from "./recommendationsModel";

/**
 * Loads recommendations for a library.
 *
 * It fetches again only when your *taste* changes (your top authors and genres)
 * or when `refresh()` is called, not whenever the library array changes. Those
 * changes happen constantly (tags arriving in the background, a favourite
 * toggled) and each refetch would reshuffle the whole list under you. When you
 * add a book from the list it simply disappears and the rest stay put.
 * `profile.bookCount` tells the UI whether they are personalised or just popular picks.
 */
export function useRecommendations(books) {
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const booksRef = useRef(books);
  booksRef.current = books;

  const profile = useMemo(() => buildTasteProfile(books), [books]);
  const tasteKey = useMemo(
    () => JSON.stringify([profile.topAuthors.slice(0, 5), profile.topGenres.slice(0, 5), profile.bookCount > 0]),
    [profile]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const owned = booksRef.current;
        const queries = planQueries(buildTasteProfile(owned));
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
        if (!cancelled) setFetched(pickRecommendations(results, owned));
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
    // The books are read through a ref on purpose: see the note above this hook.
  }, [tasteKey, nonce]);

  // Anything added since the fetch is dropped locally.
  const recommendations = useMemo(() => fetched.filter((rec) => !isInLibrary(books, rec.title, rec.author)), [fetched, books]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { recommendations, loading, error, refresh, profile };
}
