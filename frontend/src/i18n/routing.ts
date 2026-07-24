import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "oz", "ru", "en"],
  defaultLocale: "uz",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
