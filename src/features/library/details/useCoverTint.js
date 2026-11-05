import { useEffect, useMemo, useState } from "react";
import { FastAverageColor } from "fast-average-color";
import { getCoverStyle } from "../../../shared/ui/Cover";

/**
 * A colour taken from the book's cover, used to wash the details page.
 *
 * The cover image is sampled for its average colour. That only works when the
 * image host allows it (CORS); when it does not, or the book has no cover, the
 * jacket colour of the generated cover is used instead, so there is always a
 * sensible colour. It is only ever mixed into the page background at low
 * strength, so text contrast never depends on the cover.
 */
export function useCoverTint(book) {
  const fallback = useMemo(() => getCoverStyle(`${book.title || ""}${book.author || ""}`)["--cover-b"], [book.title, book.author]);
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    setColor(fallback);
    if (!book.coverUrl) return undefined;
    let active = true;
    new FastAverageColor()
      .getColorAsync(book.coverUrl, { crossOrigin: "anonymous", algorithm: "dominant" })
      .then((result) => active && setColor(result.hex))
      .catch(() => {
        /* image blocked or failed: keep the jacket colour */
      });
    return () => {
      active = false;
    };
  }, [book.coverUrl, fallback]);

  return color;
}
