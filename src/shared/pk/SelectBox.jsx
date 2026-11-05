import React from "react";
import { ChevronDown } from "lucide-react";

/** Styled native <select>. `options` is `[{ value, label }]`. */
function SelectBox({ value, onChange, options, label, className = "" }) {
  return (
    <div className={["pk-selectbox", className].filter(Boolean).join(" ")}>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </div>
  );
}

export default SelectBox;
