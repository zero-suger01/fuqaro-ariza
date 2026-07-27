"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { DepartmentAdmin, StaffRole, StaffUser } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/status";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  password: "",
  role: "department_staff" as StaffRole,
  department_id: "",
};

/** "Yangilash" — mavjud xodimni tahrirlash formasi (ism/familiya/email/
 * rol/bo'lim; telefon o'zgarmaydi — login sifatida ishlatiladi). Alohida
 * komponent + `key={user.id}`: xodim almashganda React uni qaytadan
 * yaratadi, holat effektsiz to'g'ri boshlang'ich qiymatdan boshlanadi. */
function EditUserForm({
  user,
  departments,
  onCancel,
  onSaved,
}: {
  user: StaffUser;
  departments: DepartmentAdmin[];
  onCancel: () => void;
  onSaved: (updated: StaffUser) => void;
}) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email ?? "");
  const [role, setRole] = useState<StaffRole>(user.role);
  const [departmentId, setDepartmentId] = useState(user.department_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<StaffUser>(`/api/admin/users/${user.id}`, {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        role,
        department_id: departmentId || null,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-b border-border">
      <div>
        <Label>Ism</Label>
        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </div>
      <div>
        <Label>Familiya</Label>
        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div>
        <Label>Email (ixtiyoriy)</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>Rol</Label>
        <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Bo&apos;lim (ixtiyoriy)</Label>
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Tanlanmagan</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.names.uz ?? d.code}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Bekor qilish
        </Button>
      </div>
    </form>
  );
}

function StaffUsersView() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    apiGet<StaffUser[]>("/api/admin/users").then(setUsers);
  }

  useEffect(() => {
    load();
    apiGet<DepartmentAdmin[]>("/api/admin/departments").then(setDepartments);
  }, []);

  function departmentName(id: string | null) {
    if (!id) return "—";
    return departments.find((d) => d.id === id)?.names.uz ?? "—";
  }

  // Topbar qidiruvi (mijoz so'ragan) — ism/telefon/email bo'yicha mahalliy filtr.
  const visibleUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter((u) =>
      [u.fullname, u.phone, u.email].filter(Boolean).some((f) => f!.toLowerCase().includes(searchQuery))
    );
  }, [users, searchQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/admin/users", {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        role: form.role,
        department_id: form.department_id || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: StaffUser) {
    await apiPatch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
    load();
  }

  async function handleDelete(user: StaffUser) {
    if (!window.confirm(`"${user.fullname}"ni o'chirmoqchimisiz?`)) return;
    setDeletingId(user.id);
    setDeleteError(null);
    try {
      await apiDelete(`/api/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      // Faoliyat ko'rsatgan xodimlar o'chirilMAYDI (backend tekshiradi) —
      // sababi shu yerda ko'rsatiladi (app/routers/admin.py).
      setDeleteError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell title="Xodimlar" requireRoles={["admin"]}>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Xodimlar ro&apos;yxati</h2>
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Yangi xodim
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-border">
            <div>
              <Label>Ism</Label>
              <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div>
              <Label>Familiya</Label>
              <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} required />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+998901234567" required />
            </div>
            <div>
              <Label>Email (ixtiyoriy)</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Parol</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Bo&apos;lim (ixtiyoriy)</Label>
              <Select value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}>
                <option value="">Tanlanmagan</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.names.uz ?? d.code}
                  </option>
                ))}
              </Select>
            </div>
            {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                Saqlash
              </Button>
            </div>
          </form>
        )}

        {deleteError && <p className="text-sm text-danger mb-3">{deleteError}</p>}
        {searchQuery && visibleUsers.length === 0 && (
          <p className="text-sm text-text-muted py-4 text-center">Qidiruvga mos xodim topilmadi</p>
        )}

        {users.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Xodimlar topilmadi</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {visibleUsers.map((u) =>
              editingId === u.id ? (
                <EditUserForm
                  key={u.id}
                  user={u}
                  departments={departments}
                  onCancel={() => setEditingId(null)}
                  onSaved={(updated) => {
                    setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    setEditingId(null);
                  }}
                />
              ) : (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {u.first_name[0]}
                    {u.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {u.fullname}{" "}
                    {!u.is_active && (
                      <span className="text-danger font-semibold uppercase">NOFAOL</span>
                    )}
                    </p>
                    <p className="text-xs text-text-muted">
                      {u.phone} · {ROLE_LABELS[u.role]} · {departmentName(u.department_id)}
                    </p>
                  </div>
                  {/* Tartib mijoz so'ragan: Faolsizlantirish/Faollashtirish
                      (to'xtatish) → Yangilash (tahrirlash) → O'chirish. */}
                  <button type="button" onClick={() => toggleActive(u)} className="text-xs text-accent hover:underline shrink-0">
                    {u.is_active ? "Faolsizlantirish" : "Faollashtirish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(u.id)}
                    className="flex items-center gap-1 text-xs text-accent hover:underline shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Yangilash
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(u)}
                    disabled={deletingId === u.id}
                    className="flex items-center gap-1 text-xs text-danger hover:underline shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" /> O&apos;chirish
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      <Card className="flex items-center gap-3">
        <UserCog className="h-5 w-5 text-text-muted shrink-0" />
        <p className="text-sm text-text-muted">
          Rol ruxsatlari: bo&apos;lim vakili — faqat o&apos;z bo&apos;limiga AI avtomatik yo&apos;naltirgan (yoki admin biriktirgan) murojaatlarni ko&apos;radi, ijro/javob yozadi; admin — tizim boshqaruvi, monitoring va bo&apos;limga biriktirish/qayta yo&apos;naltirish.
        </p>
      </Card>
    </AppShell>
  );
}

/** `useSearchParams()` Suspense chegarasini talab qiladi (Next.js 16). */
export default function StaffUsersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Yuklanmoqda...</div>}>
      <StaffUsersView />
    </Suspense>
  );
}
