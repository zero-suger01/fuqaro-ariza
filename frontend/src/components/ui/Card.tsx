import { clsx } from "clsx";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "bg-bg-surface border border-border rounded-card shadow-card",
        padded && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
