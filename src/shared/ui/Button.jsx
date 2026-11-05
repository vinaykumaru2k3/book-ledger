import React from "react";

/**
 * The app's one button. `variant` picks the look ("primary" | "ghost" |
 * "danger" | "success"); `icon` is an optional Lucide icon placed before the label.
 */
function Button({ variant = "ghost", compact = false, icon: Icon, iconSize = 15, className = "", type = "button", children, ...rest }) {
  const classes = ["button", variant, compact && "compact", className].filter(Boolean).join(" ");
  return (
    <button className={classes} type={type} {...rest}>
      {Icon && <Icon size={iconSize} />}
      {children != null && <span>{children}</span>}
    </button>
  );
}

export default Button;
