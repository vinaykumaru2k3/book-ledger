import { useEffect, useMemo, useState } from "react";
import { filterAndSortBooks, paginate } from "../../domain/library";

export const BOOKS_PER_PAGE = 8;

/**
 * View state for the library list: search text, sort order, layout and page.
 * `view` ("all", a status, "favorites", "shelf:<name>") comes from the URL.
 */
export function useLibraryView(books, view) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [layout, setLayout] = useState("grid");
  const [page, setPage] = useState(1);

  // Back to the first page whenever the result set changes shape.
  useEffect(() => setPage(1), [query, sortBy, view]);

  const visible = useMemo(() => filterAndSortBooks(books, { view, query, sortBy }), [books, view, query, sortBy]);
  const pageData = useMemo(() => paginate(visible, page, BOOKS_PER_PAGE), [visible, page]);

  const resetFilters = () => {
    setQuery("");
    setSortBy("recent");
  };

  return { query, setQuery, sortBy, setSortBy, layout, setLayout, setPage, visible, pageData, resetFilters };
}
