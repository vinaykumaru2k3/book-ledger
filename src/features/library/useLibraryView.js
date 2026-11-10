import { useEffect, useMemo, useState } from "react";
import { filterAndSortBooks, paginate } from "../../domain/library";

const LAYOUT_KEY = "pustaka:library-layout";

/** The last layout the reader chose on this device (grid by default). */
function readLayout() {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    return saved in PAGE_SIZES ? saved : "grid";
  } catch {
    return "grid";
  }
}

/** How many books fit comfortably on a page in each layout. */
export const PAGE_SIZES = { grid: 12, list: 10, shelf: 36 };

/**
 * View state for the library list: search text, sort order, layout and page.
 * `view` ("all", a status, "favorites", "shelf:<name>") comes from the URL.
 */
export function useLibraryView(books, view) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [layout, setLayoutState] = useState(readLayout);
  const [page, setPage] = useState(1);

  // Back to the first page whenever the result set changes shape.
  useEffect(() => setPage(1), [query, sortBy, view, layout]);

  const visible = useMemo(() => filterAndSortBooks(books, { view, query, sortBy }), [books, view, query, sortBy]);
  const pageSize = PAGE_SIZES[layout] || PAGE_SIZES.grid;
  const pageData = useMemo(() => paginate(visible, page, pageSize), [visible, page, pageSize]);

  const setLayout = (next) => {
    setLayoutState(next);
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* the choice still applies for this visit */
    }
  };

  const resetFilters = () => {
    setQuery("");
    setSortBy("recent");
  };

  return { query, setQuery, sortBy, setSortBy, layout, setLayout, setPage, visible, pageData, pageSize, resetFilters };
}
