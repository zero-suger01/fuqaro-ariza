"use client";

import { Landmark } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  uz: "O'z",
  oz: "Ўз",
  ru: "Ру",
  en: "En",
};

export function GuestHeader() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-border bg-bg-surface">
      <div className="mx-auto flex max-w-[640px] flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-text-primary">
          <Landmark className="h-7 w-7 text-accent" aria-hidden />
          <span className="text-lg font-semibold">{t("appName")}</span>
        </Link>
        <nav className="flex items-center gap-1 text-base font-medium" aria-label="Til tanlash">
          {routing.locales.map((loc, i) => (
            <span key={loc} className="flex items-center">
              {i > 0 && <span className="mx-1 text-text-muted">·</span>}
              <Link
                href={pathname}
                locale={loc}
                className={
                  loc === locale
                    ? "rounded-control px-2 py-1 text-text-primary underline underline-offset-4"
                    : "rounded-control px-2 py-1 text-text-secondary hover:text-text-primary"
                }
                aria-current={loc === locale ? "true" : undefined}
              >
                {LOCALE_LABELS[loc]}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
