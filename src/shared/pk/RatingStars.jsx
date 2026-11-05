import React from "react";
import { Star } from "lucide-react";

/**
 * Five-star rating. Editable (a radio group: click a star to set it, click the
 * current one again to clear) or `readOnly` (a labelled image).
 */
function RatingStars({ value = 0, onChange, readOnly = false, label, starLabel = (n) => `${n}`, clearLabel }) {
  const current = Math.min(Math.max(Number(value) || 0, 0), 5);
  const stars = [1, 2, 3, 4, 5];

  if (readOnly) {
    return (
      <span className="pk-stars" role="img" aria-label={`${label}: ${starLabel(current)}`}>
        {stars.map((n) => (
          <Star key={n} size={16} className={n <= current ? "pk-star pk-star--on" : "pk-star"} fill={n <= current ? "currentColor" : "none"} aria-hidden="true" />
        ))}
      </span>
    );
  }

  return (
    <div className="pk-stars" role="radiogroup" aria-label={label}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === current}
          aria-label={starLabel(n)}
          title={n === current && clearLabel ? clearLabel : starLabel(n)}
          className="pk-star-btn"
          onClick={() => onChange(n === current ? 0 : n)}
        >
          <Star size={22} className={n <= current ? "pk-star pk-star--on" : "pk-star"} fill={n <= current ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export default RatingStars;
