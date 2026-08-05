import { clsx } from "clsx";

type Lift = "none" | "rest" | "card" | "lift" | "float";
type Tone = "surface" | "subtle" | "tint" | "gold";

const lifts: Record<Lift, string> = {
  none: "",
  rest: "shadow-sm",
  card: "shadow-card",
  lift: "shadow-lift",
  float: "shadow-float",
};

const tones: Record<Tone, string> = {
  surface: "bg-bg-surface",
  subtle: "bg-bg-subtle",
  tint: "bg-accent-soft",
  gold: "bg-brass-light/25",
};

export function Card({
  children,
  className,
  padded = true,
  lift = "card",
  tone = "surface",
  bordered = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  lift?: Lift;
  tone?: Tone;
  bordered?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-card",
        tones[tone],
        lifts[lift],
        bordered && "border border-border",
        padded && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * The signature dark surface — night over a madrasah courtyard. The lapis→
 * turquoise ramp and its two soft light sources live in `.night-panel`
 * (globals.css); the panjara lattice is layered on top by the caller.
 */
export function NightPanel({
  children,
  className,
  gilded = false,
}: {
  children: React.ReactNode;
  className?: string;
  gilded?: boolean;
}) {
  return (
    <div className={clsx("night-panel", gilded && "night-panel--gilded", className)}>{children}</div>
  );
}
