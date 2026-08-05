import { clsx } from "clsx";
import { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "secondary" | "gold";

export function guestButtonClasses(variant: Variant, className?: string) {
  return clsx(
    "press relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-card px-6 py-4 text-lg font-bold",
    "min-h-[58px] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
    variant === "primary" &&
      "bg-linear-to-br from-btn-from to-btn-to text-accent-contrast shadow-action hover:brightness-[1.06]",
    variant === "secondary" &&
      "border-[1.5px] border-border-strong bg-bg-surface text-text-primary shadow-sm hover:bg-bg-subtle",
    variant === "gold" &&
      "bg-linear-to-br from-brass-light to-brass text-[#654c17] shadow-gild hover:brightness-[1.04]",
    className
  );
}

interface GuestButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Large touch-friendly button for citizen pages: height >= 58px, full
 * width, text and icon together. */
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
