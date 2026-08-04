import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "oz", "ru", "en"],
  defaultLocale: "uz",
  // Next 16 proxy internally rewrites the default locale and then re-runs
  // this proxy; `as-needed` causes `/` ↔ `/uz` redirect loops in local dev.
  // Always-prefixed paths keep the dev and production behavior deterministic.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
