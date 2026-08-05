import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold" | "night";
}

/**
 * Actions carry their own light: the primary fill is a turquoise ramp with a
 * colour-matched glow rather than a flat block, and the whole surface sinks
 * slightly on press. A flat rectangle is the fastest way to make a warm
 * palette look like a template.
 */
export const buttonBase =
  "press inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none";

export const buttonVariants = {
  primary:
    "bg-linear-to-br from-btn-from to-btn-to text-accent-contrast shadow-action hover:brightness-[1.06]",
  secondary: "bg-bg-surface text-text-primary border border-border-strong hover:bg-bg-subtle",
  ghost: "text-text-secondary hover:bg-bg-subtle",
  danger: "bg-danger text-white hover:brightness-110",
  gold: "bg-linear-to-br from-brass-light to-brass text-[#654c17] shadow-gild hover:brightness-[1.04]",
  night: "night-panel text-white shadow-lift hover:brightness-125",
} as const;

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button className={clsx(buttonBase, buttonVariants[variant], className)} {...props}>
      {children}
    </button>
  );
}
