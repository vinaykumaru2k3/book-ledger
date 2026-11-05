/**
 * Shared-element transition between a book cover in a list and the cover in
 * the details dialog, using the browser's View Transitions API.
 *
 * The browser animates any element that carries the same `view-transition-name`
 * in the "before" and "after" screens, so we name the source cover just before
 * the change and the destination cover just after it. Where the API does not
 * exist, or the user prefers reduced motion, the change simply happens.
 */
import { flushSync } from "react-dom";

export const COVER_TRANSITION_NAME = "book-cover";

function canAnimate() {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs `update` (a state change that re-renders synchronously) inside a view transition.
 *  - `from`: the element showing the cover *before* the change (gets the shared name first)
 *  - `to`: a function returning the element showing the cover *after* the change
 */
export function withCoverTransition(update, { from, to } = {}) {
  if (!canAnimate()) {
    update();
    return;
  }

  let target = null;
  if (from) from.style.viewTransitionName = COVER_TRANSITION_NAME;

  const transition = document.startViewTransition(() => {
    flushSync(update);
    // The name must exist on exactly one element in the new screen.
    if (from) from.style.viewTransitionName = "";
    target = to?.() || null;
    if (target) target.style.viewTransitionName = COVER_TRANSITION_NAME;
  });

  // A skipped or interrupted transition rejects these promises. That is normal (a second
  // click while one is running skips the first), so swallow it rather than log an error.
  const ignore = () => {};
  transition.ready?.catch(ignore);
  transition.updateCallbackDone?.catch(ignore);

  const cleanup = () => {
    if (from) from.style.viewTransitionName = "";
    if (target) target.style.viewTransitionName = "";
  };
  transition.finished.then(cleanup, cleanup);
}
