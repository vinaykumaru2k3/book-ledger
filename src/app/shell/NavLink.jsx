import React from "react";
import { buildPath } from "../routes";

/**
 * A real link (`<a href>`) that navigates inside the app without a reload.
 * Middle-click, Ctrl/Cmd-click and "open in new tab" keep working because the
 * href is genuine; only a plain left click is intercepted.
 */
function NavLink({ view, active, onNavigate, className = "", children, ...rest }) {
  const onClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(view);
  };
  return (
    <a href={buildPath(view)} onClick={onClick} aria-current={active ? "page" : undefined} className={className} {...rest}>
      {children}
    </a>
  );
}

export default NavLink;
