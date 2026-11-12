import React from "react";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
import { STATUSES } from "../../domain/status";

/** Search box, clustering mode and status filter chips above the graph. */
function GalaxyControls({ books, query, onQuery, clusterBy, onClusterBy, statusFilter, onStatusFilter, onResetCamera }) {
  const chip = (key, label, count) => (
    <button
      key={key}
      className={statusFilter === key ? "galaxy-filter active" : "galaxy-filter"}
      onClick={() => onStatusFilter(key)}
    >
      {label} <span className="galaxy-filter__count">{count}</span>
    </button>
  );

  return (
    <>
      <div className="galaxy-toolbar">
        <div className="galaxy-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search books..."
            aria-label="Search the galaxy"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </div>

        <div className="galaxy-controls">
          <div className="galaxy-selectwrap">
            <select
              value={clusterBy}
              onChange={(event) => onClusterBy(event.target.value)}
              className="galaxy-select"
              aria-label="Cluster by"
            >
              <option value="none">No Cluster</option>
              <option value="status">By Status</option>
              <option value="author">By Author</option>
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>

          <button type="button" onClick={onResetCamera} className="galaxy-btn">
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="galaxy-filters">
        {chip("all", "All", books.length)}
        {Object.entries(STATUSES).map(([key, status]) =>
          chip(key, status.label, books.filter((book) => book.status === key).length)
        )}
      </div>
    </>
  );
}

export default GalaxyControls;
