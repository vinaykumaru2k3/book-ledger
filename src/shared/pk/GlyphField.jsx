import React, { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";

// Kannada and Latin letters, drifting like dust in lamplight.
const DEFAULT_GLYPHS = "ಅಆಇಈಉಎಒಕಗಚಜತದನಪಬಮಯರಲವಸಹಳAaBbCcDdEeGgHhKkMmNnPpRrSsTtWw&§¶";
const MAX_LINK_DISTANCE = 120;

/** Fills a canvas with slowly drifting glyph particles. Pure maths, kept separate for testing. */
export function createParticles(count, width, height, glyphs, random = Math.random) {
  const chars = [...glyphs];
  return Array.from({ length: count }, () => {
    const depth = 0.15 + random() * 0.85; // 0 = far away (small, faint), 1 = close
    return {
      x: random() * width,
      y: random() * height,
      depth,
      vx: (random() - 0.5) * 0.12 * depth,
      vy: -(0.05 + random() * 0.18) * depth, // a gentle upward drift
      glyph: chars[Math.floor(random() * chars.length)],
      size: 10 + depth * 26,
      spin: (random() - 0.5) * 0.004,
      angle: (random() - 0.5) * 0.6,
      warm: random() < 0.2,
    };
  });
}

/** Advances particles one frame and wraps them around the edges. */
export function stepParticles(particles, width, height) {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.spin;
    if (p.y < -40) p.y = height + 40;
    if (p.x < -40) p.x = width + 40;
    if (p.x > width + 40) p.x = -40;
  });
}

/**
 * Decorative animated background: floating Kannada/Latin glyphs that drift
 * upward, lean away from the pointer, and link into faint constellations.
 * It pauses when off-screen or in a background tab, draws a single still
 * frame for people who prefer reduced motion, and is hidden from screen readers.
 */
function GlyphField({ glyphs = DEFAULT_GLYPHS, density = 0.00011, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!canvas || !ctx) return undefined;

    const still = prefersReducedMotion();
    const pointer = { x: -9999, y: -9999, active: false };
    let particles = [];
    let width = 0;
    let height = 0;
    let raf = null;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(Math.max(width * height * density, 36), 150));
      particles = createParticles(count, width, height, glyphs);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const shift = (p) => ({
        // Parallax: near glyphs move more with the pointer than far ones.
        x: p.x + (pointer.active ? (pointer.x - cx) * 0.025 * p.depth : 0),
        y: p.y + (pointer.active ? (pointer.y - cy) * 0.025 * p.depth : 0),
      });

      // Constellation lines between nearby close glyphs.
      const near = particles.filter((p) => p.depth > 0.62);
      ctx.lineWidth = 0.6;
      for (let i = 0; i < near.length; i += 1) {
        const a = shift(near[i]);
        for (let j = i + 1; j < near.length; j += 1) {
          const b = shift(near[j]);
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < MAX_LINK_DISTANCE) {
            ctx.strokeStyle = `rgba(236, 199, 122, ${0.12 * (1 - d / MAX_LINK_DISTANCE)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        const { x, y } = shift(p);
        // Lean away from the pointer.
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy);
        const push = pointer.active && dist < 140 ? (1 - dist / 140) * 18 * p.depth : 0;
        const px = x + (dist ? (dx / dist) * push : 0);
        const py = y + (dist ? (dy / dist) * push : 0);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.angle);
        ctx.font = `${p.size}px "Noto Serif Kannada", "Fraunces", Georgia, serif`;
        const alpha = 0.05 + p.depth * 0.26 + (push ? 0.2 : 0);
        ctx.fillStyle = p.warm ? `rgba(236, 199, 122, ${alpha})` : `rgba(239, 233, 222, ${alpha})`;
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
      });
    };

    const tick = () => {
      stepParticles(particles, width, height);
      draw();
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : null;
    };
    const start = () => {
      if (!still && raf === null && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    draw();
    start();

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= width && pointer.y <= height;
      if (still) draw();
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => start();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (resize(), draw())) : null;
    resizeObserver?.observe(canvas);
    const viewObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            start();
          })
        : null;
    viewObserver?.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      viewObserver?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [glyphs, density]);

  return <canvas ref={canvasRef} className={["pk-glyphfield", className].filter(Boolean).join(" ")} aria-hidden="true" />;
}

export default GlyphField;
