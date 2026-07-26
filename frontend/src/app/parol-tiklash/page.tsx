"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Phone, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiPost, setToken, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

interface TokenResponse {
  access_token: string;
  user: AuthUser;
}

const PASSWORD_MIN_LENGTH = 8;

/**
 * Tizimga kira olmayotgan xodim uchun — `/parol` (majburiy almashtirish,
 * joriy parolni bilgan holda) dan farqli, bu yerda joriy parol shart emas.
 * `AppShell` tashqarisida, `/login` singari.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiPost<{ detail: string }>("/api/auth/forgot-password", { phone });
      setInfo(res.detail);
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < PASSWORD_MIN_LENGTH) {
      setError(`Yangi parol kamida ${PASSWORD_MIN_LENGTH} belgidan iborat bo'lishi kerak`);
      return;
    }
    if (next !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<TokenResponse>("/api/auth/reset-password", {
        phone,
        code,
        new_password: next,
      });
      setToken(res.access_token);
      await refresh();
      router.replace(res.user.role === "admin" ? "/admin" : "/admin/navbatim");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center mb-3">
            {step === "phone" ? <Phone className="h-6 w-6 text-accent" /> : <ShieldCheck className="h-6 w-6 text-accent" />}
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Parolni tiklash</h1>
          <p className="text-sm text-text-muted mt-1 text-center">
            {step === "phone"
              ? "Telefon raqamingizni kiriting — tasdiqlash kodi SMS orqali yuboriladi"
              : info}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <div>
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" required />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full mt-2">
              {submitting ? "Yuborilmoqda..." : "Kod yuborish"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <Label>Tasdiqlash kodi</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>
            <div>
              <Label>Yangi parol</Label>
              <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
              <p className="text-xs text-text-muted mt-1">Kamida {PASSWORD_MIN_LENGTH} belgi</p>
            </div>
            <div>
              <Label>Yangi parolni tasdiqlang</Label>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full mt-2">
              <KeyRound className="h-4 w-4" /> {submitting ? "Saqlanmoqda..." : "Parolni o'rnatish"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-xs text-text-muted hover:text-text-secondary text-center"
            >
              Boshqa raqam bilan qayta urinish
            </button>
          </form>
        )}

        <p className="text-sm text-center mt-6">
          <Link href="/login" className="text-accent hover:underline">
            Kirish sahifasiga qaytish
          </Link>
        </p>
      </Card>
    </div>
  );
}
