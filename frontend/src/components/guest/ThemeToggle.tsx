"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

/** Small round dark/light toggle — persists to localStorage and flips the
 * `.dark` class on <html> (see layout.tsx's inline no-flash script, which
 * sets the initial class before this component ever mounts). */
export function ThemeToggle() {
  const t = useTranslations("common");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing / storage disabled — theme just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("lightMode") : t("darkMode")}
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border bg-bg-surface text-text-secondary transition-colors hover:text-text-primary"
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
