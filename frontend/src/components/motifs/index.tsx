"use client";

import { useId } from "react";
import {
  archPath,
  ikatFlamePath,
  pakhtaPath,
  petalPath,
  polygonPath,
  starPath,
  tendrilPath,
} from "./geometry";

/** React 19 ids contain characters that are invalid inside `url(#…)`. */
function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

/* ------------------------------------------------------------------ */

type FieldProps = {
  color?: string;
  opacity?: number;
  /** Tile edge in px. Larger reads calmer, smaller reads like textile. */
  tile?: number;
  /** Fill the star cores — reads as glazed tile rather than a window screen. */
  glazed?: boolean;
  className?: string;
};

/**
 * Panjara — the octagon-and-star lattice cut into Uzbek window screens and
 * laid in Registan tilework. An SVG `<pattern>` so it stays crisp at any
 * surface size, at whisper opacity so it never competes with content.
 *
 * Corner shapes are drawn four times so neighbouring tiles complete each
 * other — an SVG pattern clips to its own tile and does not bleed.
 */
export function GirihField({
  color = "#FFFFFF",
  opacity = 0.09,
  tile = 92,
  glazed = false,
  className,
}: FieldProps) {
  const patternId = useSvgId("girih");
  const half = tile / 2;
  const octagon = tile * 0.375;
  const star = octagon * 0.6;
  const knot = tile * 0.088;

  const nodes: [number, number][] = [
    [0, 0],
    [tile, 0],
    [0, tile],
    [tile, tile],
    [half, half],
  ];
  const knots: [number, number][] = [
    [half, 0],
    [0, half],
    [tile, half],
    [half, tile],
  ];

  return (
    <svg
      aria-hidden
      focusable="false"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    >
      <defs>
        <pattern id={patternId} width={tile} height={tile} patternUnits="userSpaceOnUse">
          {nodes.map(([cx, cy]) => (
            <path
              key={`o${cx}-${cy}`}
              d={polygonPath(cx, cy, octagon, 8, Math.PI / 8)}
              fill="none"
              stroke={color}
              strokeWidth={1.1}
              strokeLinejoin="round"
              opacity={opacity}
            />
          ))}
          {nodes.map(([cx, cy]) => (
            <path
              key={`s${cx}-${cy}`}
              d={starPath(cx, cy, star, 8, 3, Math.PI / 8)}
              fill={glazed ? color : "none"}
              fillOpacity={glazed ? opacity * 0.5 : 0}
              stroke={color}
              strokeWidth={0.9}
              strokeLinejoin="round"
              opacity={opacity * 0.85}
            />
          ))}
          {knots.map(([cx, cy]) => (
            <path
              key={`k${cx}-${cy}`}
              d={polygonPath(cx, cy, knot, 4, Math.PI / 4)}
              fill="none"
              stroke={color}
              strokeWidth={0.9}
              strokeLinejoin="round"
              opacity={opacity * 0.62}
            />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

type BloomProps = {
  size?: number;
  color?: string;
  /** Secondary colour for the inner rings — brass against turquoise reads best. */
  accent?: string;
  opacity?: number;
  filled?: boolean;
  className?: string;
};

/**
 * Palak — the great circular medallion embroidered at the centre of a
 * Bukhara suzani: a seeded core, a ring of almond petals, a counter-ring,
 * and islimi tendrils curling into the ground.
 */
export function SuzaniBloom({
  size = 168,
  color = "#FFFFFF",
  accent,
  opacity = 1,
  filled = false,
  className,
}: BloomProps) {
  const c = size / 2;
  const gold = accent ?? color;
  const outerPetals = 12;
  const innerPetals = 8;

  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <g opacity={opacity}>
        {Array.from({ length: 6 }, (_, i) => (
          <path
            key={`t${i}`}
            d={tendrilPath(c, c, c * 0.94, (i * Math.PI) / 3 + Math.PI / 12, Math.PI / 3.4)}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.008}
            strokeLinecap="round"
            opacity={0.4}
          />
        ))}

        {Array.from({ length: outerPetals }, (_, i) => {
          const angle = (i * 2 * Math.PI) / outerPetals - Math.PI / 2;
          return (
            <path
              key={`p${i}`}
              d={petalPath(c, c, c * 0.44, c * 0.86, angle, Math.PI / outerPetals, 0.62)}
              fill={filled ? color : "none"}
              fillOpacity={filled ? 0.16 : 0}
              stroke={color}
              strokeWidth={size * 0.009}
              strokeLinejoin="round"
              opacity={0.78}
            />
          );
        })}

        {Array.from({ length: innerPetals }, (_, i) => {
          const angle = (i * 2 * Math.PI) / innerPetals - Math.PI / 2 + Math.PI / innerPetals;
          return (
            <path
              key={`ip${i}`}
              d={petalPath(c, c, c * 0.2, c * 0.42, angle, Math.PI / (innerPetals * 1.3), 0.7)}
              fill={filled ? gold : "none"}
              fillOpacity={filled ? 0.22 : 0}
              stroke={gold}
              strokeWidth={size * 0.008}
              strokeLinejoin="round"
              opacity={0.9}
            />
          );
        })}

        <circle cx={c} cy={c} r={c * 0.44} fill="none" stroke={color} strokeWidth={size * 0.006} opacity={0.34} />
        <circle cx={c} cy={c} r={c * 0.2} fill="none" stroke={gold} strokeWidth={size * 0.007} opacity={0.6} />

        <path
          d={starPath(c, c, c * 0.16, 8, 3)}
          fill={gold}
          fillOpacity={filled ? 0.9 : 0.45}
          stroke={gold}
          strokeWidth={size * 0.006}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */

type MarkProps = {
  size?: number;
  color?: string;
  accent?: string;
  className?: string;
};

/**
 * The product mark: a peshtoq portal holding an eight-point star, framed by
 * the arch of a madrasah façade.
 */
export function EmblemMark({ size = 44, color = "#FFFFFF", accent, className }: MarkProps) {
  const gradientId = useSvgId("emblem");
  const gold = accent ?? color;
  const w = size;
  const h = size;
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={gold} stopOpacity={1} />
          <stop offset="1" stopColor={gold} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <path
        d={archPath(w * 0.12, h * 0.06, w * 0.76, h * 0.88)}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.055}
        strokeLinejoin="round"
        opacity={0.95}
      />
      <path d={archPath(w * 0.27, h * 0.22, w * 0.46, h * 0.72)} fill={color} opacity={0.14} />
      <path
        d={starPath(w / 2, h * 0.47, size * 0.19, 8, 3)}
        fill={`url(#${gradientId})`}
        stroke={gold}
        strokeWidth={size * 0.02}
        strokeLinejoin="round"
      />
      <path
        d={`M${w * 0.2} ${h * 0.94}H${w * 0.8}`}
        stroke={gold}
        strokeWidth={size * 0.05}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Standalone girih star — bullets, node markers, decorative punctuation. */
export function GirihStar({ size = 16, color = "#D3A63C", accent, className }: MarkProps) {
  const c = size / 2;
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <path d={starPath(c, c, c * 0.94, 8, 3)} fill={color} strokeLinejoin="round" />
      {accent ? <path d={polygonPath(c, c, c * 0.3, 4, Math.PI / 4)} fill={accent} /> : null}
    </svg>
  );
}

/** Pakhta — the open cotton boll, Uzbekistan's civic emblem. */
export function PakhtaMark({ size = 28, color = "#FFFFFF", accent, className }: MarkProps) {
  const c = size / 2;
  const gold = accent ?? color;
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <path d={pakhtaPath(c, c, c * 0.92)} fill={color} fillRule="evenodd" opacity={0.92} />
      <circle cx={c} cy={c} r={c * 0.22} fill={gold} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

/** A hairline with a girih lozenge at its centre — the quiet section divider. */
export function GildedRule({
  width = 220,
  color = "#D3A63C",
  opacity = 1,
  className,
}: {
  width?: number;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  const gradientId = useSvgId("rule");
  const height = 12;
  return (
    <svg
      aria-hidden
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        {/* A horizontal rule has a zero-height bounding box, so the default
            objectBoundingBox gradient degenerates and paints nothing. */}
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={width} y2={0}>
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.5" stopColor={color} stopOpacity={0.95} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g opacity={opacity}>
        <path d={`M0 ${height / 2}H${width}`} stroke={`url(#${gradientId})`} strokeWidth={1.4} />
        <path d={polygonPath(width / 2, height / 2, 5, 4, Math.PI / 4)} fill={color} />
        <path d={polygonPath(width / 2 - 16, height / 2, 2.4, 4, Math.PI / 4)} fill={color} opacity={0.6} />
        <path d={polygonPath(width / 2 + 16, height / 2, 2.4, 4, Math.PI / 4)} fill={color} opacity={0.6} />
      </g>
    </svg>
  );
}

/**
 * Abrbandi — "cloud binding". The warp is tied and dyed before weaving, so
 * the motif blooms into a broad skirt and tapers to a drawn-out point.
 */
export function IkatBand({
  width = 320,
  height = 34,
  color = "#FFFFFF",
  accent,
  opacity = 1,
  repeat = 5,
  className,
}: {
  width?: number;
  height?: number;
  color?: string;
  accent?: string;
  opacity?: number;
  repeat?: number;
  className?: string;
}) {
  const gradientId = useSvgId("ikat");
  const gold = accent ?? color;
  const step = width / repeat;
  // An abr flame is taller than it is wide — at 0.78 of the step it flattened
  // into a triangle and stopped reading as ikat at all.
  const flameWidth = step * 0.42;
  const flameHeight = height * 0.86;


  return (
    <svg
      aria-hidden
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={width} y2={0}>
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.22" stopColor={color} stopOpacity={0.85} />
          <stop offset="0.5" stopColor={gold} stopOpacity={1} />
          <stop offset="0.78" stopColor={color} stopOpacity={0.85} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g opacity={opacity}>
        {Array.from({ length: repeat }, (_, i) => {
          const x = i * step + (step - flameWidth) / 2;
          const flipped = i % 2 === 1;
          return (
            <path
              key={i}
              d={ikatFlamePath(x, height * 0.07, flameWidth, flameHeight)}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={1.3}
              strokeLinejoin="round"
              transform={flipped ? `rotate(180 ${x + flameWidth / 2} ${height / 2})` : undefined}
            />
          );
        })}
        {Array.from({ length: repeat - 1 }, (_, i) => (
          <path
            key={`d${i}`}
            d={polygonPath((i + 1) * step, height / 2, height * 0.12, 4, Math.PI / 4)}
            fill={gold}
            opacity={0.55}
          />
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Two girih stars turning against each other — the same construction a tile
 * setter uses to lay a rosette, borrowed as a loading indicator.
 */
export function StarLoader({
  size = 44,
  color = "var(--accent)",
  accent = "var(--brass)",
  label,
  className,
}: {
  size?: number;
  color?: string;
  accent?: string;
  label?: string;
  className?: string;
}) {
  const c = size / 2;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-busy="true"
      className={`relative inline-block ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden
        focusable="false"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 motif-spin"
      >
        <path
          d={starPath(c, c, c * 0.96, 8, 3)}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.055}
          strokeLinejoin="round"
          opacity={0.9}
        />
      </svg>
      <svg
        aria-hidden
        focusable="false"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 motif-spin-reverse"
      >
        <path
          d={polygonPath(c, c, c * 0.5, 4, Math.PI / 4)}
          fill="none"
          stroke={accent}
          strokeWidth={size * 0.05}
          strokeLinejoin="round"
        />
        <circle cx={c} cy={c} r={size * 0.055} fill={accent} />
      </svg>
    </span>
  );
}
