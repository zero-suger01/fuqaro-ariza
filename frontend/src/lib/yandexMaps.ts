/** Minimal Yandex Maps JS API loader — no wrapper library (the popular
 * `@pbe/react-yandex-maps` caps its peer dep at React 18; this project is on
 * React 19). Loads the script once and waits for `ymaps.ready()`.
 *
 * `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` is optional — Yandex Maps still loads
 * without one for light/dev use, just with a console notice and lower rate
 * limits. Set the env var once a real key is available.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type YMaps = any;

declare global {
  interface Window {
    ymaps?: YMaps;
  }
}

let loadPromise: Promise<YMaps> | null = null;

export function loadYandexMaps(): Promise<YMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Yandex Maps faqat brauzerda ishlaydi"));
  }
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    const params = new URLSearchParams({ lang: "ru_RU" });
    if (apiKey) params.set("apikey", apiKey);

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error("Yandex Maps skripti yuklandi, lekin ymaps topilmadi"));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps as YMaps));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Yandex Maps skriptini yuklab bo'lmadi"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
