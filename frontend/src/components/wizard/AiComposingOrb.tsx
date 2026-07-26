"use client";

import { useEffect, useRef } from "react";

// thinking-orbs (orbs.jakubantalik.com) "composing" effektining kattaroq,
// accent rangli (#F49A51) nusxasi — kutubxona faqat 20/64px va oq-qora
// bo'lgani uchun canvas'da qayta yozildi. To'lqin-simon ko'p lentali
// sash: 5 ta gorizontal nuqtalar lentasi sinus to'lqin bo'ylab oqadi.
const ACCENT_RGB = "244, 154, 81"; // #F49A51 — loyihaning accent rangi
const BANDS = 5;
const DOTS_PER_BAND = 42;

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
      const span = size * 0.78;
      const amp = size * 0.055;

      for (let b = 0; b < BANDS; b++) {
        const bandPhase = (b / BANDS) * Math.PI * 2;
        const bandY = cy + (b - (BANDS - 1) / 2) * size * 0.085;
        for (let i = 0; i < DOTS_PER_BAND; i++) {
          const progress = i / (DOTS_PER_BAND - 1);
          const x = cx - span / 2 + progress * span;
          const wave = Math.sin(progress * Math.PI * 3 + t * 2 + bandPhase);
          const y = bandY + wave * amp;
          // Chekkalarga yaqin nuqtalar mayda va xira
          const edge = Math.sin(progress * Math.PI);
          const alpha = 0.2 + 0.6 * edge;
          const r = 2.2 + 1.8 * edge;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
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
