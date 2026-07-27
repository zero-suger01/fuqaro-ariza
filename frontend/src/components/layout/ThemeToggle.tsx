"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Admin/xodim panelidagi kunduzgi/tungi rejim tugmasi. Mexanizm fuqaro
 * tarafidagi `components/guest/ThemeToggle` bilan bir xil (`.dark` klassi
 * <html>da + localStorage["theme"], boshlang'ich holat app/layout.tsx'dagi
 * no-flash skriptda o'rnatiladi) — shu sabab ikkalasi bir-birining
 * tanlovini eslab qoladi. Bu yerda alohida komponent, chunki admin
 * daraxtida next-intl ulanmagan (bir tilli) va Topbar sirti sidebar'dan
 * farqli neytral rangda (`text-text-secondary`, `NotificationBell` bilan
 * bir xil o'lcham/uslub). */
export function ThemeToggle() {
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
      aria-label={isDark ? "Kunduzgi rejim" : "Tungi rejim"}
      className="relative h-9 w-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-subtle transition"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
