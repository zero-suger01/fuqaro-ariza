"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * F5.3 — kutilmagan xato (server yoki render). Fuqaro «Application error»
 * degan inglizcha texnik matn ko'rmasligi kerak (docs/10 §2, §6: xatolar
 * yumshoq va aniq).
 *
 * `reset()` — Next.js beradigan qayta urinish funksiyasi: ko'p hollarda
 * xato vaqtinchalik (backend qayta ishga tushayotgan) va oddiy qayta
 * urinish yetadi.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Konsolga chiqarish — brauzer devtools'da diagnostika uchun
    // (foydalanuvchiga texnik tafsilot ko'rsatilmaydi).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <p className="text-5xl">⚠️</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-snug text-text-primary">Nimadir ishlamadi</h1>
        <p className="mx-auto max-w-[440px] text-lg leading-relaxed text-text-secondary">
          Bu vaqtinchalik nosozlik bo&apos;lishi mumkin. Qaytadan urinib ko&apos;ring — ma&apos;lumotlaringiz
          yo&apos;qolmaydi.
        </p>
      </div>
      <div className="flex w-full max-w-[360px] flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[56px] w-full items-center justify-center rounded-control bg-accent px-6 text-lg font-semibold text-white"
        >
          Qaytadan urinish
        </button>
        <Link
          href="/"
          className="flex min-h-[56px] w-full items-center justify-center rounded-control border-2 border-border-strong bg-bg-surface px-6 text-lg font-semibold text-text-primary"
        >
          Bosh sahifaga o&apos;tish
        </Link>
      </div>
      {error.digest && <p className="font-mono text-xs text-text-muted">Xato kodi: {error.digest}</p>}
    </main>
  );
}
