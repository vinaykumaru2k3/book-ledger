import React, { useId, useRef } from "react";

/**
 * Accessible tab strip (roving focus, arrow keys, Home/End).
 * Renders only the tabs; the caller shows the panel for `value`.
 * `tabs` is `[{ id, label }]`; panels may use `aria-labelledby={tabId(id)}`.
 */
function Tabs({ tabs, value, onChange, label }) {
  const prefix = useId();
  const refs = useRef({});

  const move = (index) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (event, index) => {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key]);
    }
  };

  return (
    <div className="pk-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => (refs.current[tab.id] = node)}
            id={`${prefix}-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={selected ? "pk-tab pk-tab--active" : "pk-tab"}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
