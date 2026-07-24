"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || undefined,
        password,
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-8">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="text-sm text-text-muted mt-1 text-center">Yangi hisob yarating</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ism</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <Label>Familiya</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" required />
          </div>
          <div>
            <Label>Email (ixtiyoriy)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@misol.uz" />
          </div>
          <div>
            <Label>Parol</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 6 ta belgi"
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full mt-2">
            {submitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-6">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Kirish
          </Link>
        </p>
      </Card>
    </div>
  );
}
