"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";
import type { Complaint, ComplaintStatus } from "@/lib/types";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "">("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}` : "";
    apiGet<Complaint[]>(`/api/complaints/me${query}`)
      .then(setComplaints)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <AppShell title="Mening murojaatlarim">
      <Card padded={false} className="p-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus)} className="max-w-xs">
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Murojaatlar ro&apos;yxati</h2>
          <span className="text-sm text-text-muted">
            Jami <strong className="text-text-primary">{complaints.length}</strong> ta
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : complaints.length === 0 ? (
          <div className="py-10 text-center text-text-muted text-sm">Murojaatlar topilmadi</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {complaints.map((c) => (
              <Link
                key={c.id}
                href={`/murojaatlarim/${c.id}`}
                className="flex items-center justify-between gap-4 py-4 hover:bg-bg-subtle -mx-2 px-2 rounded-inner transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{CATEGORY_LABELS[c.category]}</p>
                  <p className="text-xs text-text-muted truncate max-w-lg mt-0.5">{c.description}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(c.created_at).toLocaleDateString("uz-UZ")}
                    {c.district ? ` · ${c.district}` : ""}
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
