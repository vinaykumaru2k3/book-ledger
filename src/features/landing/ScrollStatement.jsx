import React, { useEffect, useRef } from "react";

/**
 * A large statement whose words light up one by one as it scrolls through
 * the viewport (a brightness change only, so it also runs with reduced
 * motion). Screen readers get the plain sentence.
 */
function ScrollStatement({ text }) {
  const ref = useRef(null);
  const words = text.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const spans = [...element.querySelectorAll(".pk-statement__word")];
    let raf = null;
    const update = () => {
      raf = null;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // 0 when the block enters the lower part of the screen, 1 when it reaches the upper third.
      const progress = Math.min(Math.max((viewport * 0.9 - rect.top) / (rect.height + viewport * 0.45), 0), 1);
      const lit = progress * spans.length * 1.15;
      spans.forEach((span, index) => span.style.setProperty("--lit", Math.min(Math.max(lit - index, 0), 1).toFixed(3)));
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <p className="pk-statement" ref={ref}>
      <span className="pk-visually-hidden">{text}</span>
      {words.map((word, index) => (
        <span key={index} className="pk-statement__word" aria-hidden="true">
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

export default ScrollStatement;
