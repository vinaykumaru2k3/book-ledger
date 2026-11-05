import React from "react";

/**
 * Pick-one control drawn as joined buttons (e.g. grid / list / shelf view).
 * `options` is `[{ value, label, icon }]`; labels are exposed to assistive tech
 * even when only the icon is drawn.
 */
function Segmented({ label, value, onChange, options }) {
  return (
    <div className="pk-seg" role="radiogroup" aria-label={label}>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={optionLabel}
            title={optionLabel}
            className={selected ? "pk-seg__btn pk-seg__btn--active" : "pk-seg__btn"}
            onClick={() => onChange(optionValue)}
          >
            {Icon && <Icon size={18} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;
