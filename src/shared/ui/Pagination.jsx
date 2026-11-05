import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page buttons plus a "Showing a-b of n" summary. Renders nothing for a single page. */
function Pagination({ page, pageCount, start, pageSize, total, noun = "books", onChange }) {
  if (pageCount <= 1) return null;

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        Showing <strong>{start + 1}</strong>–<strong>{Math.min(start + pageSize, total)}</strong> of{" "}
        <strong>{total}</strong> {noun}
      </div>
      <div className="pagination-buttons">
        <button
          className="pagination-btn"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous Page"
          type="button"
        >
          <ChevronLeft size={15} />
        </button>

        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            className={`pagination-btn page-num ${page === number ? "active" : ""}`}
            aria-current={page === number ? "page" : undefined}
            onClick={() => onChange(number)}
            type="button"
          >
            {number}
          </button>
        ))}

        <button
          className="pagination-btn"
          onClick={() => onChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Next Page"
          type="button"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
