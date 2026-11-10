import React, { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../../shared/lib/motion";

/**
 * The hero centrepiece: a leather-bound book drawn in CSS 3D. It opens on
 * arrival, turns a page every few seconds, and tilts gently toward the pointer.
 * Glass "chips" float around it to hint at what the app tracks.
 * Purely decorative, so it is exposed as a single image with a label.
 */
function HeroBook({ label, chips = [] }) {
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || prefersReducedMotion()) return undefined;
    let raf = null;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const loop = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      scene.style.setProperty("--tilt-x", `${current.y.toFixed(2)}deg`);
      scene.style.setProperty("--tilt-y", `${current.x.toFixed(2)}deg`);
      raf = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.01 ? requestAnimationFrame(loop) : null;
    };
    const onMove = (event) => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      target = { x: nx * 18, y: -ny * 12 };
      if (raf === null) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pk-book3d" ref={sceneRef} role="img" aria-label={label}>
      <div className="pk-book3d__glow" />
      <div className="pk-book3d__body">
        {/* Back board and the block of pages. */}
        <div className="pk-book3d__back" />
        <div className="pk-book3d__block" />

        {/* The page you see once the cover is open. */}
        <div className="pk-book3d__page pk-book3d__page--right">
          <span className="pk-book3d__chapter">Chapter One</span>
          <span className="pk-book3d__drop">P</span>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="pk-book3d__line" style={{ "--w": `${[92, 100, 86, 97, 74, 100, 90, 63, 0][i]}%` }} />
          ))}
          <span className="pk-book3d__folio">1</span>
        </div>

        {/* A page that turns over on a loop. */}
        <div className="pk-book3d__leaf">
          <div className="pk-book3d__leafFront">
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className="pk-book3d__line" style={{ "--w": `${[100, 94, 100, 88, 100, 97, 70, 100, 92, 84, 55][i]}%` }} />
            ))}
          </div>
          <div className="pk-book3d__leafBack" />
        </div>

        {/* The front cover, hinged on the left. */}
        <div className="pk-book3d__cover">
          <div className="pk-book3d__coverFront">
            <span className="pk-book3d__frame" />
            <span className="pk-book3d__ornament">❦</span>
            <span className="pk-book3d__title">Pustaka</span>
            <span className="pk-book3d__subtitle">A Reading Life</span>
            <span className="pk-book3d__ornament pk-book3d__ornament--low">✦ ✦ ✦</span>
          </div>
          <div className="pk-book3d__coverInside" />
        </div>

        <span className="pk-book3d__ribbon" />
      </div>
      <div className="pk-book3d__shadow" />

      {chips.map((chip, index) => (
        <div key={index} className={`pk-chip pk-chip--${index + 1}`} aria-hidden="true">
          {chip}
        </div>
      ))}
    </div>
  );
}

export default HeroBook;
