/**
 * F5.2 — PWA-lite manifest.
 *
 * Route handler sifatida yozilgan (statik fayl emas), chunki `name`/
 * `description` kelajakda muhitga qarab o'zgarishi mumkin va manifestni
 * `public/` da dublikat qilib saqlashdan ko'ra bitta joyda ushlab turish
 * qulay.
 *
 * Ikonlar `favicon.ico` dan foydalanadi — hozircha alohida PNG to'plami
 * yo'q, lekin manifest ularsiz ham «Bosh ekranga qo'shish» ni ishga
 * tushiradi (brauzer sahifa ikonini oladi).
 */
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Ariza — fuqarolar murojaatlari",
    short_name: "Ariza",
    description: "Uychi tumani hokimligiga murojaat yuborish va holatini kuzatish",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#0f2744",
    lang: "uz",
    dir: "ltr",
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
