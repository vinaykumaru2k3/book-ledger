import React from "react";

/** Small label. tone: "neutral" | "accent" | "gold" | "success" | "danger". */
function Badge({ tone = "neutral", icon: Icon, className = "", children, ...rest }) {
  return (
    <span className={["pk-badge", `pk-badge--${tone}`, className].filter(Boolean).join(" ")} {...rest}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
