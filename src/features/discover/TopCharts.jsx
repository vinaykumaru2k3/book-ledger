import React, { useCallback, useEffect, useState } from "react";
import { itemFromOpenLibraryDoc, searchOpenLibrary } from "../../services/bookApi";
import { isInLibrary } from "../../domain/library";
import { useBooks } from "../../app/AppContext";
import DiscoverCard from "./DiscoverCard";
import { DiscoverError, DiscoverLoading } from "./DiscoverStatus";
import { useDiscoverActions } from "./useDiscoverActions";
import { GENRES, curateChart } from "./topChartFilters";

const CANDIDATES = 100; // fetch plenty, because most get filtered out

/** The most-read books in a genre, from Open Library's reading logs. */
function TopCharts() {
  const { books } = useBooks();
  const { quickAdd, viewDetails } = useDiscoverActions();
  const [genre, setGenre] = useState(GENRES[0]);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (selected, isCancelled = () => false) => {
    setLoading(true);
    setError("");
    try {
      const docs = await searchOpenLibrary({ subject: selected.subjectKey, sort: "readinglog" }, CANDIDATES);
      if (!isCancelled()) setChart(curateChart(docs, selected.id).map(itemFromOpenLibraryDoc));
    } catch (e) {
      console.error("Failed to fetch top books:", e);
      if (!isCancelled()) setError("Failed to fetch top books list. Please try again.");
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(genre, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [genre, load]);

  return (
    <div className="top-charts-container">
      <div className="genre-selection-strip">
        {GENRES.map((g) => (
          <button
            key={g.id}
            className={`genre-select-tab ${genre.id === g.id ? "active" : ""}`}
            onClick={() => setGenre(g)}
            type="button"
          >
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <DiscoverLoading>Fetching the Top 50 books in {genre.label}...</DiscoverLoading>
      ) : error ? (
        <DiscoverError message={error} onRetry={() => load(genre)} />
      ) : (
        <div className="rec-grid">
          {chart.map((item, index) => (
            <DiscoverCard
              key={item.id}
              item={item}
              rank={index + 1}
              inLibrary={isInLibrary(books, item.title, item.author)}
              onDetails={viewDetails}
              onQuickAdd={quickAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TopCharts;
