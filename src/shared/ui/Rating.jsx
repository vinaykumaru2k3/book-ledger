import React from "react";
import { Star } from "lucide-react";

function Rating({ value, onChange, readonly = false }) {
  return (
    <div className={`rating ${readonly ? "readonly" : ""}`} aria-label={`${value || 0} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const rating = index + 1;
        const isFilled = rating <= value;
        
        if (readonly) {
          return (
            <Star 
              key={rating} 
              size={14} 
              className={isFilled ? "star-icon filled" : "star-icon"} 
            />
          );
        }

        return (
          <button
            className={isFilled ? "filled" : ""}
            key={rating}
            onClick={() => onChange(value === rating ? 0 : rating)}
            aria-label={`${rating} stars`}
            title={`${rating} stars`}
            type="button"
          >
            <Star size={16} />
          </button>
        );
      })}
    </div>
  );
}

export default Rating;
