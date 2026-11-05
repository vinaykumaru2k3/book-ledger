import React from "react";
import { Compass, RefreshCw, Sparkles, ThumbsUp } from "lucide-react";
import Button from "../../shared/ui/Button";
import { useBooks } from "../../app/AppContext";
import DiscoverCard from "./DiscoverCard";
import { DiscoverError, DiscoverLoading } from "./DiscoverStatus";
import { useDiscoverActions } from "./useDiscoverActions";
import { useRecommendations } from "./useRecommendations";

function Reason({ item }) {
  return (
    <div className="rec-reason-badge">
      <span>{item.reason}</span>
      {item.inspiringBook && (
        <span className="inspiring-title" title={`Because you liked ${item.inspiringBook.title}`}>
          Because you liked: <em>{item.inspiringBook.title}</em>
        </span>
      )}
    </div>
  );
}

/** Book suggestions based on the authors and genres in your library. */
function Recommendations() {
  const { books } = useBooks();
  const { recommendations, loading, error, refresh, profile } = useRecommendations(books);
  const { quickAdd, viewDetails } = useDiscoverActions();

  return (
    <div className="recommendations-container">
      <div className="rec-toolbar">
        <div className="rec-info-banner">
          {profile.bookCount > 0 ? (
            <>
              <ThumbsUp size={15} />
              <span>Personalized recommendations based on your entire bookshelf collection.</span>
            </>
          ) : (
            <>
              <Compass size={15} />
              <span>Add some books to your shelf to get custom recommendations. Currently showing trending books.</span>
            </>
          )}
        </div>

        <Button compact className="rec-refresh-btn" disabled={loading} onClick={refresh}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </Button>
      </div>

      {loading ? (
        <DiscoverLoading>Analyzing shelf and querying database for books...</DiscoverLoading>
      ) : error ? (
        <DiscoverError message={error} onRetry={refresh} />
      ) : recommendations.length === 0 ? (
        <div className="rec-empty-panel">
          <Sparkles size={24} />
          <p>No new recommendations found. Your library is already well-stocked!</p>
        </div>
      ) : (
        <div className="rec-grid">
          {recommendations.map((item) => (
            <DiscoverCard
              key={item.id}
              item={item}
              reason={<Reason item={item} />}
              onDetails={viewDetails}
              onQuickAdd={quickAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Recommendations;
