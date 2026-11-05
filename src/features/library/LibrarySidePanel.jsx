import React, { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { STATUSES } from "../../domain/status";
import { currentlyReading, recentlyFinished } from "../../domain/library";
import ReadingStack from "./ReadingStack";

/** Right-hand column of the library: completion bars plus reading lists. */
function LibrarySidePanel({ books, stats }) {
  const reading = useMemo(() => currentlyReading(books), [books]);
  const finished = useMemo(() => recentlyFinished(books), [books]);

  return (
    <aside className="insights-panel">
      <div className="insight-block">
        <div className="panel-heading">
          <BarChart3 size={15} />
          <h3>Reading Progress</h3>
          <span className="panel-badge">{stats.completionRate}% done</span>
        </div>
        <div className="completion-meter">
          <span style={{ width: `${stats.completionRate}%` }} />
        </div>
        <div className="status-bars">
          {Object.entries(STATUSES).map(([key, status]) => (
            <div className="status-bar-row" key={key}>
              <span className="status-bar-label">{status.longLabel}</span>
              <div className="status-bar-track">
                <i style={{ width: `${stats.total ? (stats[key] / stats.total) * 100 : 0}%`, background: status.color }} />
              </div>
              <strong>{stats[key]}</strong>
            </div>
          ))}
        </div>
      </div>

      <ReadingStack title="Reading Now" books={reading} empty="No active books." />
      <ReadingStack title="Recently Finished" books={finished} empty="No books completed yet." />
    </aside>
  );
}

export default LibrarySidePanel;
