/**
 * Status marker. The colour arrives as a raw value (status maps hand these
 * out), so the tint is mixed from it rather than pulled from a token —
 * `color-mix` keeps the chip readable on both the ivory and the dark canvas,
 * which a fixed `1f` alpha suffix did not.
 */
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 14%, var(--bg-surface))`,
        color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
