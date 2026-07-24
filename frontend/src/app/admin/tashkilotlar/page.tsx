"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import type { Organization, ComplaintCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/status";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    apiGet<Organization[]>("/api/admin/organizations").then(setOrganizations);
  }, []);

  return (
    <AppShell title="Tashkilotlar" requireAdmin>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Mas&apos;ul tashkilotlar</h2>
          <span className="text-sm text-text-muted">
            Jami <strong className="text-text-primary">{organizations.length}</strong> ta
          </span>
        </div>

        {organizations.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Tashkilotlar topilmadi</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {organizations.map((org) => (
              <div key={org.id} className="flex items-center gap-3 rounded-inner border border-border px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{org.name}</p>
                  <p className="text-xs text-text-muted">
                    {CATEGORY_LABELS[org.category as ComplaintCategory] ?? org.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
