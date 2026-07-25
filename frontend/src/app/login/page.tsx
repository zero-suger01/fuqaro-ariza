"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(loginValue, password);
      // R1: department_staff dashboardga kira olmaydi (admin-only) — uni
      // to'g'ridan-to'g'ri ish navbatiga olib boramiz (premortem X1).
      const staffHome = user.role === "admin" ? "/admin" : "/admin/navbatim";
      router.push(user.kind === "staff" ? staffHome : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app px-4">
      <Card className="w-full max-w-sm" >
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Xodimlar tizimiga kirish</h1>
          <p className="text-sm text-text-muted mt-1 text-center">
            Admin panelga kirish uchun hisobingizga kiring
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label>Telefon yoki email</Label>
            <Input
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              placeholder="+998901234567"
              required
            />
          </div>
          <div>
            <Label>Parol</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full mt-2">
            {submitting ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-6">
          Xodim hisobini faqat administrator yaratadi.
        </p>
      </Card>
    </div>
  );
}
