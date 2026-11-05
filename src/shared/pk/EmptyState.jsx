import React from "react";

/** Friendly "nothing here yet" block with an optional icon and action. */
function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="pk-empty">
      {Icon && (
        <span className="pk-empty__icon" aria-hidden="true">
          <Icon size={28} />
        </span>
      )}
      <h3 className="pk-empty__title">{title}</h3>
      {children && <p className="pk-empty__body">{children}</p>}
      {action}
    </div>
  );
}

export default EmptyState;
