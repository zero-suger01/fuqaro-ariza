"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilterX, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";
import type { Complaint, ComplaintCategory, ComplaintStatus } from "@/lib/types";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

interface Filters {
  status: ComplaintStatus | "";
  category: ComplaintCategory | "";
  district: string;
  neighborhood: string;
  date_from: string;
  date_to: string;
  search: string;
}

const EMPTY_FILTERS: Filters = {
  status: "",
  category: "",
  district: "",
  neighborhood: "",
  date_from: "",
  date_to: "",
  search: "",
};

export default function AdminComplaintsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    apiGet<Complaint[]>(`/api/admin/complaints?${params.toString()}`)
      .then(setComplaints)
      .finally(() => setLoading(false));
  }, [filters]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <AppShell title="Murojaatlar" requireAdmin>
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Holat</Label>
            <Select value={filters.status} onChange={(e) => update("status", e.target.value as ComplaintStatus)}>
              <option value="">Barcha holatlar</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Kategoriya</Label>
            <Select value={filters.category} onChange={(e) => update("category", e.target.value as ComplaintCategory)}>
              <option value="">Barchasi</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tuman</Label>
            <Input value={filters.district} onChange={(e) => update("district", e.target.value)} placeholder="Tuman" />
          </div>
          <div>
            <Label>Mahalla</Label>
            <Input value={filters.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="Mahalla" />
          </div>
          <div>
            <Label>Sana (dan)</Label>
            <Input type="date" value={filters.date_from} onChange={(e) => update("date_from", e.target.value)} />
          </div>
          <div>
            <Label>Sana (gacha)</Label>
            <Input type="date" value={filters.date_to} onChange={(e) => update("date_to", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-4">
            <Label>Qidiruv</Label>
            <Input value={filters.search} onChange={(e) => update("search", e.target.value)} placeholder="Tavsif bo'yicha qidirish..." />
          </div>
          <div className="lg:col-span-2">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setFilters(EMPTY_FILTERS)}>
              <FilterX className="h-4 w-4" /> Tozalash
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Murojaatlar ro&apos;yxati</h2>
          <span className="text-sm text-text-muted">
            Jami <strong className="text-text-primary">{complaints.length}</strong> ta
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : complaints.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-text-muted text-sm">
            <ClipboardList className="h-6 w-6" />
            Murojaatlar topilmadi
            <span className="text-xs">Filtrlarni o&apos;zgartirib qayta urinib ko&apos;ring</span>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {complaints.map((c) => (
              <Link
                key={c.id}
                href={`/admin/murojaatlar/${c.id}`}
                className="flex items-center justify-between gap-4 py-3.5 hover:bg-bg-subtle -mx-2 px-2 rounded-inner transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{CATEGORY_LABELS[c.category]}</p>
                  <p className="text-xs text-text-muted truncate max-w-xl">{c.description}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(c.created_at).toLocaleDateString("uz-UZ")}
                    {c.district ? ` · ${c.district}` : ""}
                    {c.neighborhood ? `, ${c.neighborhood}` : ""}
                  </p>
                </div>
                <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
