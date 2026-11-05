import React from "react";
import { Check, Plus, Trophy } from "lucide-react";
import Cover from "../../shared/ui/Cover";
import Button from "../../shared/ui/Button";

/**
 * A catalogue book on the Discover pages. Optional extras: `rank` (chart
 * position), `reason` (why it was recommended) and `inLibrary` (already owned).
 */
function DiscoverCard({ item, rank, reason, inLibrary = false, onDetails, onQuickAdd }) {
  return (
    <div className={`book-card rec-card ${rank ? "top-chart-card" : ""}`.trim()}>
      {rank && (
        <div className="chart-rank-badge">
          <Trophy size={11} />
          <span>#{rank}</span>
        </div>
      )}

      <div className="cover-wrapper clickable-cover" onClick={() => onDetails(item)} title="Click to view details">
        <Cover book={item} />
      </div>

      <div className="book-main">
        <div className="book-heading">
          {reason}
          <h3 className="book-title clickable-title" onClick={() => onDetails(item)}>
            {item.title}
          </h3>
          <p className="book-author-meta">
            by {item.author}
            {item.publishedYear ? ` • ${item.publishedYear}` : ""}
            {item.pages ? ` • ${item.pages} pages` : ""}
          </p>
        </div>

        {item.genres.length > 0 && (
          <div className="tag-row">
            {item.genres.map((genre) => (
              <span key={genre} className="tag-badge">
                {genre}
              </span>
            ))}
          </div>
        )}

        <div className="rec-actions">
          <Button compact onClick={() => onDetails(item)}>
            Details
          </Button>
          {inLibrary ? (
            <Button compact variant="success" icon={Check} iconSize={13} disabled>
              In Library
            </Button>
          ) : (
            <Button compact variant="primary" icon={Plus} iconSize={13} onClick={() => onQuickAdd(item)}>
              Quick Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscoverCard;
