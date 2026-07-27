"use client";

import { useEffect, useRef } from "react";

// thinking-orbs (orbs.jakubantalik.com) "composing" effektining kattaroq,
// #0d3138 rangli nusxasi — kutubxona faqat 20/64px va oq-qora
// bo'lgani uchun canvas'da qayta yozildi. Aylana shaklida: 5 ta konsentrik
// nuqtali halqa radius bo'ylab to'lqinlanib oqadi (undulating rings).
const ACCENT_RGB = "13, 49, 56"; // #0d3138
const RINGS = 5;
const DOTS_PER_RING = 44;

export function AiComposingOrb({
  size = 300,
  ariaLabel,
}: {
  size?: number;
  ariaLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let t = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const maxR = size * 0.4;
      const amp = size * 0.028;

      for (let ring = 0; ring < RINGS; ring++) {
        const ringPhase = (ring / RINGS) * Math.PI * 2;
        const baseR = maxR * (0.35 + 0.65 * (ring / (RINGS - 1)));
        for (let i = 0; i < DOTS_PER_RING; i++) {
          const angle = (i / DOTS_PER_RING) * Math.PI * 2;
          // Halqa bo'ylab oqayotgan to'lqin — radius ozgina siljiydi
          const wave = Math.sin(angle * 4 + t * 2.2 + ringPhase);
          const r = baseR + wave * amp;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          // To'lqin cho'qqisidagi nuqtalar yorqinroq
          const glow = 0.5 + 0.5 * wave;
          const alpha = 0.3 + 0.55 * glow;
          const dotR = 2 + 1.8 * glow;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ACCENT_RGB}, ${alpha})`;
          ctx.fill();
        }
      }

      if (!reduced) {
        t += 0.016;
        raf = requestAnimationFrame(draw);
      }
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
      className="max-w-full"
    />
  );
}
