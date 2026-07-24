import { clsx } from "clsx";
import { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "secondary";

function guestButtonClasses(variant: Variant, className?: string) {
  return clsx(
    "flex w-full items-center justify-center gap-3 rounded-card px-6 py-4 text-lg font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
    "min-h-[56px]",
    variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
    variant === "secondary" && "bg-bg-surface text-text-primary border-2 border-border-strong hover:bg-bg-subtle",
    className
  );
}

interface GuestButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Large touch-friendly button for citizen pages (docs/10-ui-ux.md §2:
 * height >= 56px, full width, text + icon together). */
export function GuestButton({ variant = "primary", className, children, ...props }: GuestButtonProps) {
  return (
    <button className={guestButtonClasses(variant, className)} {...props}>
      {children}
    </button>
  );
}

interface GuestLinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
}

/** Same look as GuestButton but renders a single `<a>` (via next-intl's
 * locale-aware Link) — never nest a `<button>` inside an `<a>`. */
export function GuestLinkButton({ href, variant = "primary", className, children, ...props }: GuestLinkButtonProps) {
  return (
    <Link href={href} className={guestButtonClasses(variant, className)} {...props}>
      {children}
    </Link>
  );
}
