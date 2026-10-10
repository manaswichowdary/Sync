"use client";

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number };

export function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots: Dot[] = Array.from({ length: 36 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
    }));

    let raf = 0;
    let tick = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      tick += 1;
      if (tick % 2 === 0) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w;
          canvas.height = h;
        }
        if (w > 0 && h > 0) {
          for (const dot of dots) {
            dot.x += dot.vx;
            dot.y += dot.vy;
            if (dot.x < 0 || dot.x > 100) dot.vx *= -1;
            if (dot.y < 0 || dot.y > 100) dot.vy *= -1;
          }
          ctx.clearRect(0, 0, w, h);
          const pts = dots.map((dot) => ({ x: (dot.x / 100) * w, y: (dot.y / 100) * h }));
          ctx.lineWidth = 1;
          for (let i = 0; i < pts.length; i += 1) {
            for (let j = i + 1; j < pts.length; j += 1) {
              const dx = pts[i].x - pts[j].x;
              const dy = pts[i].y - pts[j].y;
              const dist = Math.hypot(dx, dy);
              if (dist < 120) {
                ctx.strokeStyle = `rgba(116, 124, 93, ${0.35 * (1 - dist / 120)})`;
                ctx.beginPath();
                ctx.moveTo(pts[i].x, pts[i].y);
                ctx.lineTo(pts[j].x, pts[j].y);
                ctx.stroke();
              }
            }
          }
          ctx.fillStyle = "rgba(62, 130, 78, 0.55)";
          for (const point of pts) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="dot-field" aria-hidden="true" />;
}
