"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type Neighborhood = { neighborhood_id: string; name: string; total: number; open: number; resolved: number };
type Summary = { district: { name: string; total: number; open: number; resolved: number; overdue: number }; by_status: Record<string, number>; neighborhoods: Neighborhood[] };

export default function DistrictDrilldown() {
  const { districtId } = useParams<{ districtId: string }>();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (districtId) apiGet<Summary>(`/api/province/districts/${districtId}/summary`).then(setData).catch((e) => setError(e.message || "Ma'lumot yuklanmadi")); }, [districtId]);
  return <AppShell title="Tuman tafsilotlari" requireRoles={["province_admin", "system_admin"]}>
    <Link href="/admin/viloyat" className="text-sm text-accent hover:underline">← Viloyat ko&apos;rinishiga qaytish</Link>
    {error ? <Card className="border-danger text-danger">Ma&apos;lumot yuklanmadi: {error}</Card> : !data ? <Card className="h-48 animate-pulse bg-bg-subtle"><span /></Card> : <>
      <div><p className="text-sm font-medium uppercase tracking-[0.16em] text-accent">Tuman tafsilotlari</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">{data.district.name}</h1><p className="mt-1 text-sm text-text-secondary">Murojaatlar va mahallalar kesimida.</p></div>
      <div className="grid gap-4 md:grid-cols-4"><Card><p className="text-sm text-text-secondary">Jami murojaat</p><p className="mt-2 font-mono text-3xl font-semibold">{data.district.total}</p></Card><Card><p className="text-sm text-text-secondary">Ochiq ishlar</p><p className="mt-2 font-mono text-3xl font-semibold text-accent">{data.district.open}</p></Card><Card><p className="text-sm text-text-secondary">Hal qilingan</p><p className="mt-2 font-mono text-3xl font-semibold text-success">{data.district.resolved}</p></Card><Card><p className="text-sm text-text-secondary">Muddati o&apos;tgan</p><p className="mt-2 font-mono text-3xl font-semibold text-danger">{data.district.overdue}</p></Card></div>
      <Card><h2 className="text-lg font-semibold text-text-primary">MFYlar kesimi</h2><p className="mt-1 text-sm text-text-secondary">Murojaatlar qaysi mahallalarda ko&apos;proq kelayotganini ko&apos;rsatadi.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><tr><th className="pb-3">MFY</th><th className="pb-3 text-right">Jami</th><th className="pb-3 text-right">Ochiq</th><th className="pb-3 text-right">Hal qilingan</th></tr></thead><tbody>{data.neighborhoods.map((n) => <tr key={n.neighborhood_id} className="border-b border-border/60 last:border-0"><td className="py-3 font-medium text-text-primary">{n.name}</td><td className="py-3 text-right font-mono">{n.total}</td><td className="py-3 text-right font-mono text-accent">{n.open}</td><td className="py-3 text-right font-mono text-success">{n.resolved}</td></tr>)}</tbody></table></div></Card>
    </>}
  </AppShell>;
}
