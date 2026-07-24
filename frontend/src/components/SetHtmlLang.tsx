"use client";

import { useEffect } from "react";

/** The root `<html lang>` is fixed at "uz" (admin stays uz-only), so citizen
 * pages update it client-side once their locale is known. Proper SSR-level
 * `lang` per route is revisited in F5.1 (accessibility pass). */
export function SetHtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "uz";
    };
  }, [locale]);
  return null;
}
