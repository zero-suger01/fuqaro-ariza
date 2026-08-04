"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, MapPin, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type DistrictSummary = { district_id: string; code: string; name: string; parent_district_id: string | null; total: number; open: number; resolved: number; overdue: number };
type Overview = { region_id: string | null; region_name: string; total: number; open: number; resolved: number; overdue: number; districts: DistrictSummary[] };
type TrendPoint = { day: string; total: number; resolved: number };

const numberFormat = new Intl.NumberFormat("uz-UZ");

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function MetricCard({ label, value, detail, icon: Icon, tone = "default" }: { label: string; value: number; detail: string; icon: typeof Activity; tone?: "default" | "accent" | "success" | "danger" }) {
  const colors = { default: "text-text-primary", accent: "text-accent", success: "text-success", danger: "text-danger" };
  return <Card className="relative overflow-hidden"><div className={`flex h-9 w-9 items-center justify-center rounded-control bg-bg-subtle ${colors[tone]}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm text-text-secondary">{label}</p><p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${colors[tone]}`}>{numberFormat.format(value)}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></Card>;
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return <div className="flex h-44 items-center justify-center rounded-control border border-dashed border-border text-sm text-text-muted">Trend uchun ma&apos;lumot yetarli emas</div>;
  const width = 760;
  const height = 220;
  const left = 42;
  const right = 12;
  const top = 18;
  const bottom = 28;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(...points.map((p) => p.total), 1);
  const x = (index: number) => left + (index / (points.length - 1)) * chartWidth;
  const y = (value: number) => top + chartHeight - (value / max) * chartHeight;
  const totalPoints = points.map((p, i) => `${x(i)},${y(p.total)}`).join(" ");
  const resolvedPoints = points.map((p, i) => `${x(i)},${y(p.resolved)}`).join(" ");
  const totalArea = `M ${x(0)} ${top + chartHeight} L ${totalPoints} L ${x(points.length - 1)} ${top + chartHeight} Z`;
  const resolvedArea = `M ${x(0)} ${top + chartHeight} L ${resolvedPoints} L ${x(points.length - 1)} ${top + chartHeight} Z`;
  const latest = points[points.length - 1];
  const tickValues = [max, Math.round(max / 2), 0];
  return <div className="overflow-hidden"><div className="mb-4 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-pill bg-accent/[0.08] px-3 py-1.5 text-xs font-medium text-accent"><i className="h-2 w-2 rounded-full bg-accent" />Kelgan</span><span className="inline-flex items-center gap-2 rounded-pill bg-success/[0.08] px-3 py-1.5 text-xs font-medium text-success"><i className="h-2 w-2 rounded-full bg-success" />Hal qilingan</span><span className="ml-auto rounded-pill border border-border px-3 py-1.5 text-xs text-text-muted">So&apos;nggi {points.length} kun</span></div><div className="rounded-control border border-border/70 bg-bg-subtle/45 p-3"><div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-medium text-text-muted">Kunlik murojaatlar</span><span className="font-mono text-xs text-text-secondary">Bugun: <b className="text-accent">{latest.total}</b> / <b className="text-success">{latest.resolved}</b></span></div><svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label="Kunlik murojaatlar trendi"><defs><linearGradient id="totalFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient><linearGradient id="resolvedFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity="0.16" /><stop offset="100%" stopColor="var(--success)" stopOpacity="0" /></linearGradient></defs>{tickValues.map((tick, index) => <g key={tick}><line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} stroke="var(--border)" strokeDasharray={index === tickValues.length - 1 ? undefined : "3 5"} /><text x={left - 10} y={y(tick) + 4} textAnchor="end" fill="var(--text-muted)" className="text-[11px]">{tick}</text></g>)}<path d={totalArea} fill="url(#totalFill)" /><path d={resolvedArea} fill="url(#resolvedFill)" /><polyline fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={totalPoints} /><polyline fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={resolvedPoints} />{points.map((point, index) => <g key={point.day}><circle cx={x(index)} cy={y(point.total)} r={index === points.length - 1 ? 5 : 3} fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="2"><title>{point.day}: {point.total} ta kelgan</title></circle><circle cx={x(index)} cy={y(point.resolved)} r={index === points.length - 1 ? 5 : 3} fill="var(--bg-surface)" stroke="var(--success)" strokeWidth="2"><title>{point.day}: {point.resolved} ta hal qilingan</title></circle></g>)}</svg><div className="flex justify-between px-9 text-[11px] text-text-muted"><span>{new Date(points[0].day).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}</span><span>{new Date(points[points.length - 1].day).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}</span></div></div></div>;
}

function RiskRow({ district }: { district: DistrictSummary }) {
  const ratio = district.total > 0 ? Math.min(100, Math.round((district.overdue / district.total) * 100)) : 0;
  return <Link href={`/admin/viloyat/${district.district_id}`} className="group block rounded-control border border-border/70 p-3 transition hover:border-accent hover:bg-bg-subtle"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-text-primary">{district.name}</span><span className="font-mono text-sm font-semibold text-danger">{district.overdue}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-bg-subtle"><div className="h-full rounded-pill bg-danger" style={{ width: `${ratio}%` }} /></div><p className="mt-1 text-[11px] text-text-muted">{district.open} ochiq • {ratio}% muddati o&apos;tgan</p></Link>;
}

export default function ProvinceDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const [overview, trend] = await Promise.all([
        apiGet<Overview>("/api/province/overview"),
        apiGet<TrendPoint[]>("/api/province/trends?days=30"),
      ]);
      setData(overview);
      setTrends(trend);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumot yuklanmadi");
    } finally {
      setRefreshing(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial dashboard fetch
  useEffect(() => { load(); }, []);

  const riskDistricts = useMemo(() => [...(data?.districts ?? [])].sort((a, b) => b.overdue - a.overdue || b.open - a.open).slice(0, 5), [data]);
  const bestDistrict = useMemo(() => [...(data?.districts ?? [])].sort((a, b) => percent(b.resolved, b.total) - percent(a.resolved, a.total))[0], [data]);

  return <AppShell title="Viloyat monitoringi" requireRoles={["province_admin", "system_admin"]}>
    {error ? <Card className="border-danger text-danger"><div className="flex items-center justify-between gap-4"><span>Viloyat ma&apos;lumotlari yuklanmadi: {error}</span><button className="inline-flex items-center gap-2 text-sm font-medium underline" onClick={load}><RefreshCw className="h-4 w-4" />Qayta yuklash</button></div></Card> : !data ? <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((n) => <Card key={n} className="h-36 animate-pulse bg-bg-subtle"><span /></Card>)}</div> : <>
      <div className="flex justify-end"><button onClick={load} disabled={refreshing} className="inline-flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-subtle disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Yangilash</button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Jami murojaatlar" value={data.total} detail={`${data.districts.length} ta hudud bo'yicha`} icon={Activity} /><MetricCard label="Ochiq ishlar" value={data.open} detail={`${percent(data.open, data.total)}% hali ijroda`} icon={Clock3} tone="accent" /><MetricCard label="Hal qilingan" value={data.resolved} detail={`${percent(data.resolved, data.total)}% natija`} icon={CheckCircle2} tone="success" /><MetricCard label="Muddati o'tgan" value={data.overdue} detail={data.overdue > 0 ? "Tezkor aralashuv talab qiladi" : "Muammo aniqlanmadi"} icon={AlertTriangle} tone="danger" /></div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]"><Card><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">Murojaatlar dinamikasi</h2><p className="mt-1 text-sm text-text-secondary">Kelgan va hal qilingan murojaatlarning kunlik taqqoslanishi.</p></div><Activity className="h-5 w-5 text-accent" /></div><TrendChart points={trends} /></Card><Card><div className="mb-4"><h2 className="text-lg font-semibold text-text-primary">Tezkor signal</h2><p className="mt-1 text-sm text-text-secondary">Rahbariyat e&apos;tiborini talab qilayotgan joylar.</p></div><div className="space-y-3"><div className="rounded-control bg-danger/[0.06] p-3"><div className="flex items-center gap-2 text-sm font-medium text-danger"><AlertTriangle className="h-4 w-4" />Muddati o&apos;tganlar</div><p className="mt-1 text-2xl font-semibold text-text-primary">{data.overdue} <span className="text-sm font-normal text-text-muted">murojaat</span></p></div><div className="rounded-control bg-success/[0.06] p-3"><div className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />Eng yaxshi natija</div><p className="mt-1 truncate text-sm font-semibold text-text-primary">{bestDistrict?.name ?? "—"}</p><p className="mt-1 text-xs text-text-muted">{bestDistrict ? `${percent(bestDistrict.resolved, bestDistrict.total)}% hal qilingan` : "Ma'lumot yo'q"}</p></div></div></Card></div>
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]"><Card><div className="mb-4 flex items-start justify-between"><div><h2 className="text-lg font-semibold text-text-primary">Xavfli hududlar</h2><p className="mt-1 text-sm text-text-secondary">Muddati o&apos;tgan murojaatlar bo&apos;yicha.</p></div><MapPin className="h-5 w-5 text-danger" /></div><div className="space-y-2">{riskDistricts.length ? riskDistricts.map((district) => <RiskRow key={district.district_id} district={district} />) : <p className="py-8 text-center text-sm text-text-muted">Hozircha xavfli hudud aniqlanmadi.</p>}</div></Card><Card><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">Tumanlar kesimi</h2><p className="mt-1 text-sm text-text-secondary">Har bir hududni ochib, MFYlar bo&apos;yicha tafsilotni ko&apos;ring.</p></div><span className="text-xs text-text-muted">{data.districts.length} hudud</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><tr><th className="pb-3">Hudud</th><th className="pb-3 text-right">Jami</th><th className="pb-3 text-right">Ochiq</th><th className="pb-3 text-right">Natija</th><th className="pb-3 text-right">Muddati o&apos;tgan</th><th className="pb-3" /></tr></thead><tbody>{data.districts.map((district) => <tr key={district.district_id} className="border-b border-border/60 last:border-0"><td className={`py-3 font-medium text-text-primary ${district.parent_district_id ? "pl-5 text-text-secondary" : ""}`}>{district.parent_district_id ? "↳ " : ""}{district.name}</td><td className="py-3 text-right font-mono">{numberFormat.format(district.total)}</td><td className="py-3 text-right font-mono text-accent">{numberFormat.format(district.open)}</td><td className="py-3 text-right font-mono text-success">{percent(district.resolved, district.total)}%</td><td className="py-3 text-right font-mono text-danger">{numberFormat.format(district.overdue)}</td><td className="py-3 text-right"><Link href={`/admin/viloyat/${district.district_id}`} aria-label={`${district.name} tafsilotlari`} className="inline-flex rounded-control p-2 text-text-muted hover:bg-bg-subtle hover:text-accent"><ArrowRight className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div></Card></div>
    </>}
  </AppShell>;
}
