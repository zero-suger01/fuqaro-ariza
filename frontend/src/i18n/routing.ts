import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "oz", "ru", "en"],
  defaultLocale: "uz",
  // Next 16 proxy internally rewrites the default locale and then re-runs
  // this proxy; `as-needed` causes `/` ↔ `/uz` redirect loops in local dev.
  // Always-prefixed paths keep the dev and production behavior deterministic.
  localePrefix: "always",
  // Mobil brauzerlarda Accept-Language ko'pincha "en" bo'ladi — shu sabab
  // avtomatik aniqlashni o'chiramiz, har doim defaultLocale (uz) bilan boshlanadi.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
