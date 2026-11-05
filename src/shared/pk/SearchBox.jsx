import React from "react";
import { Search, X } from "lucide-react";

/** Search input with a leading icon and a clear button once there is text. */
function SearchBox({ value, onChange, label, placeholder, clearLabel = "Clear", className = "" }) {
  return (
    <div className={["pk-searchbox", className].filter(Boolean).join(" ")}>
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
      />
      {value && (
        <button type="button" className="pk-searchbox__clear" onClick={() => onChange("")} aria-label={clearLabel}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default SearchBox;
