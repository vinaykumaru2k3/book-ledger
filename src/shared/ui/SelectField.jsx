import React from "react";
import { ChevronDown } from "lucide-react";

/** Styled native <select>. `options` is `[{ value, label }]`. */
function SelectField({ value, onChange, options, label, className = "", chevron = true }) {
  return (
    <div className={`select-wrap ${className}`.trim()}>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {chevron && <ChevronDown size={14} />}
    </div>
  );
}

export default SelectField;
