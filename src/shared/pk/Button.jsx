import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Primary action control.
 * variant: "primary" | "secondary" | "ghost" | "danger"; size: "sm" | "md" | "lg".
 * `loading` disables the button and shows a spinner while keeping its width.
 */
function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  loading = false,
  className = "",
  type = "button",
  disabled = false,
  children,
  ...rest
}) {
  const classes = ["pk-btn", `pk-btn--${variant}`, `pk-btn--${size}`, className].filter(Boolean).join(" ");
  return (
    <button className={classes} type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="pk-spin" size={16} aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      {children != null && <span>{children}</span>}
    </button>
  );
}

export default Button;
