"use client";

import { useSyncExternalStore } from "react";

/** Joriy vaqt (ms), daqiqaga yaxlitlangan — deadline/«muddat o'tdi» belgilari
 * uchun. Soat TASHQI manba sifatida ulanadi (`useSyncExternalStore`): render
 * pok qoladi (React Compiler `Date.now()`ni render ichida taqiqlaydi) va
 * sahifa soatlab ochiq tursa belgilar o'zi yangilanadi.
 *
 * Snapshot daqiqaga yaxlitlangani muhim — aks holda har chaqiruvda yangi
 * qiymat qaytib, cheksiz qayta render bo'lardi.
 */
const MINUTE_MS = 60_000;

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, MINUTE_MS);
  return () => clearInterval(timer);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

/** SSR/gidratsiya paytida 0 — komponent buni "vaqt hali noma'lum" deb
 * o'qiydi va sana/muddat belgilarini gidratsiyadan keyin ko'rsatadi. */
function getServerSnapshot(): number {
  return 0;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
