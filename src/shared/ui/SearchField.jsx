import React from "react";
import { Search } from "lucide-react";

/** Text input with a leading search icon. `children` renders after the input (e.g. a spinner). */
function SearchField({ value, onChange, placeholder, label = "Search", className = "", children, ...rest }) {
  return (
    <label className={`search-field ${className}`.trim()}>
      <Search size={18} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        {...rest}
      />
      {children}
    </label>
  );
}

export default SearchField;
