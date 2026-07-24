"use client";

import { useEffect, useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
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

export default function StaffUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentAdmin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        {users.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Xodimlar topilmadi</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3">
                <div className="h-9 w-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {u.first_name[0]}
                  {u.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {u.fullname} {!u.is_active && <span className="text-text-muted">(nofaol)</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    {u.phone} · {ROLE_LABELS[u.role]} · {departmentName(u.department_id)}
                  </p>
                </div>
                <button type="button" onClick={() => toggleActive(u)} className="text-xs text-accent hover:underline shrink-0">
                  {u.is_active ? "Faolsizlantirish" : "Faollashtirish"}
                </button>
              </div>
            ))}
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
