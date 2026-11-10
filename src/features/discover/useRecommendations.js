import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchOpenLibrary } from "../../services/bookApi";
import { PER_QUERY, alreadyOwned, buildTasteProfile, groupRecommendations, pickRecommendations, planQueries } from "./recommendationsModel";

const HIDDEN_KEY = "pustaka:rec-hidden";
const FIELDS =
  "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,isbn,language,ratings_average,ratings_count,readinglog_count";

function readHidden() {
  try {
    const list = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

/**
 * Loads recommendations for a library.
 *
 * It fetches again only when your *taste* changes (your strongest authors,
 * genres and languages) or when `refresh()` is called, not whenever the
 * library array changes. Those changes happen constantly (tags arriving in the
 * background, a favourite toggled) and each refetch would reshuffle the list
 * under you. A book you add, or dismiss with `dismiss(id)` ("not for me"),
 * simply disappears and the rest stay put. Dismissals are remembered on this
 * device. `profile.bookCount` tells the UI whether picks are personalised.
 */
export function useRecommendations(books) {
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  const [hidden, setHidden] = useState(readHidden);

  const booksRef = useRef(books);
  booksRef.current = books;
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  const profile = useMemo(() => buildTasteProfile(books), [books]);
  const tasteKey = useMemo(
    () =>
      JSON.stringify([
        profile.authors.slice(0, 5).map((a) => a.name),
        profile.genres.slice(0, 5).map((g) => g.name),
        profile.scripts.map((s) => s.script),
        profile.bookCount > 0,
      ]),
    [profile]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const owned = booksRef.current;
        const taste = buildTasteProfile(owned);
        const queries = planQueries(taste);
        const results = await Promise.all(
          queries.map(async (query) => {
            try {
              return { query, docs: await searchOpenLibrary({ ...query.params, fields: FIELDS }, PER_QUERY) };
            } catch (e) {
              console.error(`Failed to fetch recommendations for ${query.value}:`, e);
              return { query, docs: [] };
            }
          })
        );
        if (cancelled) return;
        if (results.every((r) => !r.docs.length)) {
          setError("We couldn't reach the book catalogue. Check your connection and try again.");
          setFetched([]);
          return;
        }
        setFetched(
          pickRecommendations(results, owned, {
            hidden: hiddenRef.current,
            disliked: taste.disliked,
            readerScripts: new Set(taste.scripts.map((entry) => entry.script)),
          })
        );
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

  // Anything added or dismissed since the fetch is dropped locally.
  const recommendations = useMemo(
    () => fetched.filter((rec) => !hidden.has(rec.id) && !alreadyOwned(books, rec)),
    [fetched, books, hidden]
  );
  const groups = useMemo(() => groupRecommendations(recommendations), [recommendations]);

  const dismiss = useCallback((id) => {
    setHidden((current) => {
      const next = new Set(current).add(id);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next].slice(-500)));
      } catch {
        /* still hidden for this visit */
      }
      return next;
    });
  }, []);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { recommendations, groups, loading, error, refresh, dismiss, profile };
}
