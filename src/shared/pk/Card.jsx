import React from "react";

/** Paper surface. `interactive` adds the lift-on-hover used for clickable cards. */
function Card({ as: Tag = "div", interactive = false, padded = true, className = "", children, ...rest }) {
  const classes = ["pk-card", interactive && "pk-card--interactive", padded && "pk-card--padded", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

export default Card;
