import Link from "next/link";

/**
 * F5.3 — 404. Fuqaro sahifalari qoidalari amal qiladi (docs/10 §2):
 * texnik atama yo'q, matn ≥18px, tugma ≥56px, bitta aniq harakat.
 *
 * `not-found` root darajada — u locale prefiksisiz yo'llar (`/admin`,
 * `/login`) uchun ham ishlaydi, shuning uchun matn `uz` da hardcode
 * (bu holatda locale ma'lum emas).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <p className="font-mono text-5xl font-bold text-accent">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-snug text-text-primary">Bu sahifa topilmadi</h1>
        <p className="mx-auto max-w-[440px] text-lg leading-relaxed text-text-secondary">
          Havola eskirgan yoki xato yozilgan bo&apos;lishi mumkin. Bosh sahifadan davom eting.
        </p>
      </div>
      <div className="flex w-full max-w-[360px] flex-col gap-3">
        <Link
          href="/"
          className="flex min-h-[56px] w-full items-center justify-center rounded-control bg-accent px-6 text-lg font-semibold text-accent-contrast"
        >
          Bosh sahifaga o&apos;tish
        </Link>
        <Link
          href="/holat"
          className="flex min-h-[56px] w-full items-center justify-center rounded-control border-2 border-border-strong bg-bg-surface px-6 text-lg font-semibold text-text-primary"
        >
          Murojaat holatini tekshirish
        </Link>
      </div>
    </main>
  );
}
