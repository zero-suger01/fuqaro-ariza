"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, ClipboardList, Bell, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS, CATEGORY_LABELS } from "@/lib/status";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex-1 min-w-[160px]">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-3xl font-semibold text-text-primary mt-2 font-mono">{value}</p>
    </Card>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/admin");
    }
  }, [user, router]);

  useEffect(() => {
    apiGet<Complaint[]>("/api/complaints/me").then(setComplaints).catch(() => setComplaints([]));
  }, []);

  const total = complaints?.length ?? 0;
  const resolved = complaints?.filter((c) => c.status === "hal_qilindi").length ?? 0;
  const inProgress =
    complaints?.filter((c) => ["jarayonda", "masul_tashkilotga_yuborildi"].includes(c.status)).length ?? 0;
  const recent = complaints?.slice(0, 5) ?? [];

  return (
    <AppShell title="Bosh sahifa">
      <div className="flex flex-col md:flex-row gap-4">
        <StatCard label="Jami murojaatlar" value={total} />
        <StatCard label="Jarayonda" value={inProgress} />
        <StatCard label="Hal qilingan" value={resolved} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">So&apos;nggi murojaatlar</h2>
            <Link href="/murojaatlarim" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
              Barchasini ko&apos;rish <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">Hozircha murojaat yubormagansiz</div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recent.map((c) => (
                <Link
                  key={c.id}
                  href={`/murojaatlarim/${c.id}`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-bg-subtle -mx-2 px-2 rounded-inner transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{CATEGORY_LABELS[c.category]}</p>
                    <p className="text-xs text-text-muted truncate max-w-md">{c.description}</p>
                  </div>
                  <Badge label={STATUS_LABELS[c.status]} color={STATUS_COLORS[c.status]} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-1">Tezkor amallar</h2>
          <p className="text-sm text-text-muted mb-4">Asosiy bo&apos;limlarga o&apos;tish</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/ariza/yangi"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <FilePlus2 className="h-4 w-4 text-accent" /> Ariza yuborish
            </Link>
            <Link
              href="/murojaatlarim"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <ClipboardList className="h-4 w-4 text-accent" /> Mening murojaatlarim
            </Link>
            <Link
              href="/bildirishnomalar"
              className="flex items-center gap-3 rounded-inner border border-border px-4 py-3 text-sm font-medium text-text-primary hover:border-accent transition"
            >
              <Bell className="h-4 w-4 text-accent" /> Bildirishnomalar
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
