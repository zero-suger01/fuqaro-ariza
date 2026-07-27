import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-accent text-accent-contrast hover:bg-accent-hover",
        variant === "secondary" && "bg-bg-subtle text-text-primary border border-border hover:bg-border/40",
        variant === "ghost" && "text-text-secondary hover:bg-bg-subtle",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
