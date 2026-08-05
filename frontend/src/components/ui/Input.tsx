import { clsx } from "clsx";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-text-secondary">{children}</label>;
}

/** Shared frame: the focus ring recolours the whole border and lays a soft
 * turquoise halo behind it, so the active field is obvious on a phone held
 * at arm's length rather than a 1px hint. */
const field =
  "w-full rounded-control border-[1.5px] border-border-strong bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(field, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(field, "resize-none", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(field, className)} {...props}>
      {children}
    </select>
  );
}
