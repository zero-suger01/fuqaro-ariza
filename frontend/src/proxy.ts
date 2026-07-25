// Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()` —
// the request-handling logic is unchanged, only the file/export name.
// See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function proxy(request: Parameters<typeof intlMiddleware>[0]) {
  return intlMiddleware(request);
}

export const config = {
  // Skip admin/auth (not locale-prefixed), API proxying, static assets.
  // `parol` — majburiy parol almashtirish sahifasi (v1.4), xodimlar uchun,
  // shu sabab u ham locale prefiksisiz.
  matcher: ["/((?!api|admin|login|register|parol|_next|.*\\..*).*)"],
};
