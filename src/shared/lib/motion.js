/**
 * Small motion helpers shared by animated pages.
 *  - `prefersReducedMotion()` honours the operating-system setting.
 *  - `useInView(ref)` becomes true once the element scrolls into view, so demos
 *    and counters only play when someone can actually see them.
 */
import { useEffect, useState } from "react";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function useInView(ref, { once = true, threshold = 0.25, rootMargin = "0px 0px -8% 0px" } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true); // old browsers and tests: just show everything
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, once, threshold, rootMargin]);

  return inView;
}
