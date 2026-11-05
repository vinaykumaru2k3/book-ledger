import React from "react";
import { BookOpen, CalendarDays, CheckCircle, Library, Star } from "lucide-react";

/** One-line summary of the library: totals, reading, finished, this year, rating. */
function StatsStrip({ stats }) {
  const items = [
    { icon: Library, tone: "teal", value: stats.total, label: "Total Books" },
    { icon: CheckCircle, tone: "plum", value: stats.done, label: "Finished" },
    { icon: BookOpen, tone: "gold", value: stats.reading, label: "Reading" },
    { icon: CalendarDays, tone: "plum", value: stats.finishedThisYear, label: `Completed ${new Date().getFullYear()}` },
    { icon: Star, tone: "coral", value: stats.averageRating, label: "Avg Rating" },
  ];

  return (
    <div className="stats-strip" aria-label="Shelf stats summary">
      {items.map(({ icon: Icon, tone, value, label }, index) => (
        <React.Fragment key={label}>
          {index > 0 && <div className="stat-divider" />}
          <div className="stat-item">
            <Icon size={15} className={`stat-icon ${tone}`} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export default StatsStrip;
