import { useEffect, useState } from "react";
import { DESCRIPTION_PLACEHOLDER, fetchOpenLibraryDescription } from "../../services/bookApi";

const NOT_AVAILABLE = "No description available for this book.";

/**
 * The synopsis to show for a book. Uses the stored description when there is
 * one; for Open Library works that have none, loads it on demand.
 */
export function useBookDescription(book) {
  const stored = book.description && book.description !== DESCRIPTION_PLACEHOLDER ? book.description : "";
  const workKey = [book.sourceKey, book.id].find((key) => key?.startsWith("/works/")) || null;
  const [fetched, setFetched] = useState(null); // null = not loaded yet

  useEffect(() => {
    setFetched(null);
    if (stored || !workKey) return undefined;
    let active = true;
    fetchOpenLibraryDescription(workKey).then((text) => active && setFetched(text || NOT_AVAILABLE));
    return () => {
      active = false;
    };
  }, [stored, workKey]);

  return { description: stored || fetched || "", loading: !stored && Boolean(workKey) && fetched === null };
}
