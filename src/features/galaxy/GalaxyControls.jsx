import React from "react";
import { Search } from "lucide-react";
import { STATUSES } from "../../domain/status";

/** Search box, clustering mode and status filter chips above the graph. */
function GalaxyControls({ books, query, onQuery, clusterBy, onClusterBy, statusFilter, onStatusFilter, onResetCamera }) {
  const chip = (key, label, count) => (
    <button
      key={key}
      className={statusFilter === key ? "galaxy-filter active" : "galaxy-filter"}
      onClick={() => onStatusFilter(key)}
    >
      {label} ({count})
    </button>
  );

  return (
    <>
      <div className="galaxy-toolbar">
        <div className="galaxy-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search books..."
            aria-label="Search the galaxy"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </div>

        <div className="galaxy-controls">
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

          <button onClick={onResetCamera} className="galaxy-btn">
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
