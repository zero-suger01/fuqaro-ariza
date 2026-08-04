"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

const MIN_LENGTH = 8;

/**
 * Majburiy parol almashtirish (v1.4, docs/04 §5).
 *
 * Seed'dan yaratilgan admin `must_change_password=true` bilan keladi va
 * `AppShell` uni shu sahifaga yo'naltiradi. Avval seed hardcode qilingan
 * `admin123` ni yaratardi va bu hisob production'ga o'zgarishsiz chiqib
 * ketishi mumkin edi.
 *
 * Bu sahifa ATAYLAB `AppShell` ichida emas — sidebar/menyu ko'rsatilsa
 * foydalanuvchi parol almashtirmasdan boshqa sahifaga o'tib ketardi.
 */
export default function ChangePasswordPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.kind !== "staff") router.replace("/login");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_LENGTH) {
      setError(`Yangi parol kamida ${MIN_LENGTH} belgidan iborat bo'lishi kerak`);
      return;
    }
    if (next !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiPost<AuthUser>("/api/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      await refresh();
      router.replace(["district_admin", "system_admin"].includes(updated.role ?? "") ? "/admin" : updated.role === "province_admin" ? "/admin/viloyat" : "/admin/navbatim");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.kind !== "staff") {
    return <div className="flex h-screen items-center justify-center text-text-muted text-sm">Yuklanmoqda...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-subtle p-4">
      <Card className="w-full max-w-[420px]">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">Parolni almashtirish</h1>
        </div>
        <p className="text-sm text-text-secondary mb-5">
          {user.must_change_password
            ? "Hisobingiz vaqtinchalik parol bilan yaratilgan. Davom etish uchun yangi parol belgilang."
            : "Xavfsizlik uchun parolni vaqti-vaqti bilan almashtirib turing."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Joriy parol</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <Label>Yangi parol</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1">Kamida {MIN_LENGTH} belgi</p>
          </div>
          <div>
            <Label>Yangi parolni tasdiqlang</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            <KeyRound className="h-4 w-4" /> {saving ? "Saqlanmoqda..." : "Parolni saqlash"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
