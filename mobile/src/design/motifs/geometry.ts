/**
 * Path builders for the Uzbek ornament set.
 *
 * Everything here is computed rather than hand-drawn so the motifs stay
 * geometrically true: an eight-point girih star really is the {8/3} star
 * polygon used in Timurid tilework, not an approximation.
 */

const round = (value: number) => Math.round(value * 1000) / 1000;

export type Point = readonly [number, number];

export function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

const xy = ([x, y]: Point) => `${round(x)} ${round(y)}`;

/**
 * Ratio between inner and outer radius for a regular {n/skip} star polygon.
 * For the eight-point girih star (n = 8, skip = 3) this resolves to √2 − 1.
 */
export function starRatio(points: number, skip: number) {
  return Math.cos((skip * Math.PI) / (2 * points)) / Math.cos(Math.PI / (2 * points));
}

/** Regular star polygon. `rotation` is in radians, 0 puts a tip straight up. */
export function starPath(
  cx: number,
  cy: number,
  outer: number,
  points = 8,
  skip = 3,
  rotation = 0,
) {
  const inner = outer * starRatio(points, skip);
  const step = Math.PI / points;
  let path = '';
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + i * step - Math.PI / 2;
    path += `${i === 0 ? 'M' : 'L'}${xy(polar(cx, cy, radius, angle))}`;
  }
  return `${path}Z`;
}

/** Regular polygon — octagons for the panjara lattice, hexagons for infill. */
export function polygonPath(cx: number, cy: number, radius: number, sides: number, rotation = 0) {
  let path = '';
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * 2 * Math.PI) / sides - Math.PI / 2;
    path += `${i === 0 ? 'M' : 'L'}${xy(polar(cx, cy, radius, angle))}`;
  }
  return `${path}Z`;
}

/**
 * A single suzani petal: almond shaped, base on the inner ring, tip outward.
 * `spread` is the half angular width at the base, in radians.
 */
export function petalPath(
  cx: number,
  cy: number,
  base: number,
  tip: number,
  angle: number,
  spread: number,
  bulge = 0.6,
) {
  const reach = base + (tip - base) * bulge;
  const left = polar(cx, cy, base, angle - spread);
  const right = polar(cx, cy, base, angle + spread);
  const point = polar(cx, cy, tip, angle);
  const ctrlLeft = polar(cx, cy, reach, angle - spread * 1.25);
  const ctrlRight = polar(cx, cy, reach, angle + spread * 1.25);
  const ctrlBase = polar(cx, cy, base * 0.82, angle);
  return `M${xy(left)}Q${xy(ctrlLeft)} ${xy(point)}Q${xy(ctrlRight)} ${xy(right)}Q${xy(ctrlBase)} ${xy(left)}Z`;
}

/**
 * Islimi tendril — the curling vine that fills the ground between medallions.
 * Drawn as a single open cubic so it can be stroked.
 */
export function tendrilPath(cx: number, cy: number, radius: number, angle: number, sweep: number) {
  const start = polar(cx, cy, radius * 0.42, angle);
  const mid = polar(cx, cy, radius * 0.86, angle + sweep * 0.45);
  const end = polar(cx, cy, radius * 0.58, angle + sweep);
  const c1 = polar(cx, cy, radius * 0.92, angle + sweep * 0.08);
  const c2 = polar(cx, cy, radius * 1.04, angle + sweep * 0.72);
  return `M${xy(start)}C${xy(c1)} ${xy(mid)} ${xy(mid)}S${xy(c2)} ${xy(end)}`;
}

/**
 * Ikat ("abr" — cloud-bound) flame. Tying the warp before dyeing makes the
 * motif bloom into a broad skirt and taper to a drawn-out point, which is the
 * silhouette this traces: wide at the hem, pinched at the neck, tipped like a
 * candle flame.
 */
export function ikatFlamePath(x: number, y: number, width: number, height: number) {
  const p = (fx: number, fy: number) => `${round(x + width * fx)} ${round(y + height * fy)}`;
  return [
    `M${p(0, 1)}`,
    `C${p(0.04, 0.68)} ${p(0.28, 0.55)} ${p(0.34, 0.34)}`,
    `C${p(0.38, 0.16)} ${p(0.45, 0.06)} ${p(0.5, 0)}`,
    `C${p(0.55, 0.06)} ${p(0.62, 0.16)} ${p(0.66, 0.34)}`,
    `C${p(0.72, 0.55)} ${p(0.96, 0.68)} ${p(1, 1)}`,
    `C${p(0.75, 0.9)} ${p(0.25, 0.9)} ${p(0, 1)}`,
    'Z',
  ].join('');
}

/** Pointed peshtoq arch — the portal silhouette of a madrasah. */
export function archPath(x: number, y: number, width: number, height: number) {
  const cx = x + width / 2;
  const spring = y + height * 0.42;
  return [
    `M${round(x)} ${round(y + height)}`,
    `L${round(x)} ${round(spring)}`,
    `Q${round(x)} ${round(y + height * 0.1)} ${round(cx)} ${round(y)}`,
    `Q${round(x + width)} ${round(y + height * 0.1)} ${round(x + width)} ${round(spring)}`,
    `L${round(x + width)} ${round(y + height)}`,
    'Z',
  ].join('');
}

/** Pakhta — an open cotton boll, Uzbekistan's civic emblem. */
export function pakhtaPath(cx: number, cy: number, radius: number) {
  const lobes = 4;
  let path = '';
  for (let i = 0; i < lobes; i += 1) {
    const angle = (i * 2 * Math.PI) / lobes - Math.PI / 2;
    path += petalPath(cx, cy, radius * 0.2, radius, angle, Math.PI / lobes, 0.78);
  }
  for (let i = 0; i < lobes; i += 1) {
    const angle = (i * 2 * Math.PI) / lobes - Math.PI / 2 + Math.PI / lobes;
    path += petalPath(cx, cy, radius * 0.16, radius * 0.62, angle, Math.PI / (lobes * 1.6), 0.7);
  }
  return path;
}
