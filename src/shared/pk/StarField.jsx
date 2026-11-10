import React, { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";

/*
 * A night sky drawn on a canvas: stars at three depths that twinkle,
 * constellations that draw themselves one after another (every book "becomes
 * a star"), an occasional shooting star and light pointer parallax.
 *
 * With "reduce motion" on (Windows: Animation effects off) the sky stays
 * alive but calm: stars twinkle and constellations fade in and out, while
 * everything that travels (parallax, shooting stars) is switched off.
 * Decorative only.
 */

const TINTS = ["239, 233, 222", "239, 233, 222", "239, 233, 222", "236, 199, 122", "196, 210, 255"];

/** Random stars spread over the canvas. Pure, so it can be tested. */
export function createStars(count, width, height, random = Math.random) {
  return Array.from({ length: count }, () => {
    const depth = random(); // 0 = far, 1 = near
    return {
      x: random() * width,
      y: random() * height,
      depth,
      r: 0.35 + depth * depth * 1.35,
      alpha: 0.25 + depth * 0.65,
      phase: random() * Math.PI * 2,
      speed: 0.6 + random() * 1.8,
      tint: TINTS[Math.floor(random() * TINTS.length)],
    };
  });
}

/**
 * A constellation: starting from `start`, repeatedly hop to the nearest
 * unused bright star within `reach`. Returns the chain of star indexes.
 */
export function buildConstellation(stars, start, size = 6, reach = 170) {
  const chain = [start];
  const used = new Set(chain);
  while (chain.length < size) {
    const from = stars[chain[chain.length - 1]];
    let best = -1;
    let bestDistance = reach;
    stars.forEach((star, index) => {
      if (used.has(index) || star.depth < 0.55) return;
      const distance = Math.hypot(star.x - from.x, star.y - from.y);
      if (distance > 24 && distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    if (best < 0) break;
    chain.push(best);
    used.add(best);
  }
  return chain;
}

/** Picks a few well-separated constellations, favouring the right-hand side. */
export function pickConstellations(stars, width, count = 4, random = Math.random) {
  const bright = stars.map((s, i) => [s, i]).filter(([s]) => s.depth > 0.7);
  const result = [];
  for (let tries = 0; tries < 40 && result.length < count; tries += 1) {
    const [star, index] = bright[Math.floor(random() * bright.length)] || [];
    if (!star || (star.x < width * 0.35 && random() < 0.7)) continue;
    const clash = result.some((chain) => Math.hypot(stars[chain[0]].x - star.x, stars[chain[0]].y - star.y) < 220);
    if (clash) continue;
    const chain = buildConstellation(stars, index);
    if (chain.length >= 4) result.push(chain);
  }
  return result;
}

const CYCLE = 9000; // ms each constellation takes to draw, hold and fade

function StarField({ density = 0.00045, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!canvas || !ctx) return undefined;

    const calm = prefersReducedMotion();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let stars = [];
    let constellations = [];
    let width = 0;
    let height = 0;
    let raf = null;
    let visible = true;
    let shooting = null;
    let nextShot = performance.now() + 4000;
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Phones resize the viewport while scrolling (address bar); keep the same sky for small height changes.
      const sameSky = stars.length && Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 160;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (sameSky) return;
      stars = createStars(Math.round(Math.min(Math.max(width * height * density, 120), 700)), width, height);
      constellations = pickConstellations(stars, width);
    };

    // A little pointer parallax: near stars move more than far ones. Stars never
    // wrap around the edges, so constellation lines can never stretch across the screen.
    const place = (star) => ({ x: star.x + pointer.x * star.depth * 16, y: star.y + pointer.y * star.depth * 12 });

    const draw = (now) => {
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, width, height);

      // Stars.
      stars.forEach((star) => {
        const { x, y } = place(star);
        const depth = calm ? 0.2 : 0.4;
        const twinkle = 1 - depth + depth * Math.sin(elapsed * 0.001 * star.speed + star.phase);
        ctx.fillStyle = `rgba(${star.tint}, ${star.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(x, y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Constellations, one at a time: draw the lines in, hold, fade out.
      constellations.forEach((chain, index) => {
        const local = (elapsed - index * CYCLE + constellations.length * CYCLE * 10) % (constellations.length * CYCLE);
        if (local > CYCLE) return;
        const progress = Math.min(local / (CYCLE * 0.45), 1);
        const fade = local > CYCLE * 0.8 ? 1 - (local - CYCLE * 0.8) / (CYCLE * 0.2) : Math.min(local / 600, 1);
        const points = chain.map((i) => place(stars[i]));
        const segments = points.length - 1;
        const drawn = progress * segments;
        ctx.strokeStyle = `rgba(236, 199, 122, ${0.32 * fade})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let s = 0; s < segments; s += 1) {
          if (s >= drawn) break;
          const part = Math.min(drawn - s, 1);
          const a = points[s];
          const b = points[s + 1];
          ctx.lineTo(a.x + (b.x - a.x) * part, a.y + (b.y - a.y) * part);
        }
        ctx.stroke();
        points.forEach((p, i) => {
          if (i > drawn + 0.001) return;
          ctx.fillStyle = `rgba(246, 228, 180, ${0.9 * fade})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // An occasional shooting star.
      if (!calm) {
        if (!shooting && now > nextShot) {
          shooting = { x: width * (0.3 + Math.random() * 0.7), y: height * Math.random() * 0.35, born: now };
          nextShot = now + 7000 + Math.random() * 9000;
        }
        if (shooting) {
          const t = (now - shooting.born) / 900;
          if (t >= 1) {
            shooting = null;
          } else {
            const headX = shooting.x - t * 260;
            const headY = shooting.y + t * 120;
            const gradient = ctx.createLinearGradient(headX, headY, headX + 90, headY - 42);
            gradient.addColorStop(0, `rgba(239, 233, 222, ${0.8 * (1 - t)})`);
            gradient.addColorStop(1, "rgba(239, 233, 222, 0)");
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.lineTo(headX + 90, headY - 42);
            ctx.stroke();
          }
        }
      }
    };

    const tick = (now) => {
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      draw(now);
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : null;
    };
    const start = () => {
      if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    draw(performance.now());
    start();

    const onPointerMove = (event) => {
      pointer.tx = event.clientX / window.innerWidth - 0.5;
      pointer.ty = event.clientY / window.innerHeight - 0.5;
    };
    const onVisibility = () => start();
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (resize(), draw(performance.now()))) : null;
    resizeObserver?.observe(canvas);
    const viewObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            start();
          })
        : null;
    viewObserver?.observe(canvas);
    if (!calm) window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      viewObserver?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return <canvas ref={canvasRef} className={["pk-starfield", className].filter(Boolean).join(" ")} aria-hidden="true" />;
}

export default StarField;
