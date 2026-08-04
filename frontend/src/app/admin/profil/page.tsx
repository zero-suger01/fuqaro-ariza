"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Phone, Trash2, UserCog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/status";
import type { AuthUser } from "@/lib/types";

const PASSWORD_MIN_LENGTH = 8;

function AvatarCard({ user, onUpdated }: { user: AuthUser; onUpdated: () => Promise<void> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiPostForm("/api/auth/me/avatar", formData);
      await onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rasm yuklanmadi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await apiDelete("/api/auth/me/avatar");
      await onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "O'chirilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex items-center gap-5">
      <div className="h-20 w-20 shrink-0 rounded-full bg-navy-900 text-white flex items-center justify-center text-xl font-semibold overflow-hidden">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-primary">Profil rasmi</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-4 w-4" /> Rasm yuklash
          </Button>
          {user.avatar_url && (
            <Button type="button" variant="ghost" disabled={busy} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> O&apos;chirish
            </Button>
          )}
        </div>
        <p className="text-xs text-text-muted">JPEG, PNG, WEBP — 10 MB gacha</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </Card>
  );
}

function ProfileInfoCard({ user, onUpdated }: { user: AuthUser; onUpdated: () => Promise<void> }) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiPatch("/api/auth/me", {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
      });
      await onUpdated();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <UserCog className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold text-text-primary">Shaxsiy ma&apos;lumotlar</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Ism</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <Label>Familiya</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Email (ixtiyoriy)</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-text-muted">
          <div>
            <Label>Telefon</Label>
            <p className="px-3.5 py-2.5">{user.phone}</p>
          </div>
          <div>
            <Label>Rol</Label>
            <p className="px-3.5 py-2.5">
              {user.role ? ROLE_LABELS[user.role] : "—"}
              {user.department_name ? ` — ${user.department_name}` : ""}
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        {saved && <p className="text-sm text-success sm:col-span-2">Saqlandi</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next.length < PASSWORD_MIN_LENGTH) {
      setError(`Yangi parol kamida ${PASSWORD_MIN_LENGTH} belgidan iborat bo'lishi kerak`);
      return;
    }
    if (next !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/auth/change-password", { current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold text-text-primary">Parolni almashtirish</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
        <div>
          <Label>Joriy parol</Label>
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <Label>Yangi parol</Label>
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <p className="text-xs text-text-muted mt-1">Kamida {PASSWORD_MIN_LENGTH} belgi</p>
        </div>
        <div>
          <Label>Yangi parolni tasdiqlang</Label>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-success">Parol yangilandi</p>}
        <div>
          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            {saving ? "Saqlanmoqda..." : "Parolni saqlash"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DistrictSupportCard() {
  const [districtName, setDistrictName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<{ district_name: string; support_phone: string | null }>("/api/admin/district-settings")
      .then((settings) => { setDistrictName(settings.district_name); setPhone(settings.support_phone ?? ""); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Sozlamani yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    try {
      await apiPatch("/api/admin/district-settings", { support_phone: phone || null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saqlab bo'lmadi");
    } finally { setSaving(false); }
  }

  return <Card>
    <div className="mb-4 flex items-center gap-2"><Phone className="h-5 w-5 text-accent" /><div><h2 className="text-base font-semibold text-text-primary">Fuqaro aloqa raqami</h2><p className="text-xs text-text-muted">{districtName || "Tuman"} fuqarolari ko&apos;radigan raqam</p></div></div>
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <div><Label>“Qiynalsangiz qo&apos;ng&apos;iroq qiling” raqami</Label><Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" disabled={loading} /><p className="mt-1 text-xs text-text-muted">E.164 format: +998XXXXXXXXX. Bo&apos;sh qoldirilsa umumiy raqam ko&apos;rsatiladi.</p></div>
      {error && <p className="text-sm text-danger">{error}</p>}{saved && <p className="text-sm text-success">Aloqa raqami saqlandi</p>}
      <div><Button type="submit" disabled={loading || saving}>{saving ? "Saqlanmoqda..." : "Raqamni saqlash"}</Button></div>
    </form>
  </Card>;
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();

  if (!user) return null;

  return (
    <AppShell title="Mening profilim">
      <div className="flex flex-col gap-6 max-w-2xl">
        <AvatarCard user={user} onUpdated={refresh} />
        <ProfileInfoCard user={user} onUpdated={refresh} />
        {user.role === "district_admin" && <DistrictSupportCard />}
        <PasswordCard />
      </div>
    </AppShell>
  );
}
