"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type Region = { id: string; code: string; names: Record<string, string>; is_active: boolean };
type Neighborhood = { id: string; district_id: string; name: string; is_active: boolean };
type District = { id: string; region_id: string; parent_district_id: string | null; code: string; names: Record<string, string>; is_active: boolean; neighborhoods: Neighborhood[] };

export default function HududlarPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [regionId, setRegionId] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [parentId, setParentId] = useState("");
  const [mfyDraft, setMfyDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [r, d] = await Promise.all([apiGet<Region[]>("/api/system/regions"), apiGet<District[]>("/api/system/districts")]);
    setRegions(r); setDistricts(d); if (!regionId && r[0]) setRegionId(r[0].id);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- initial catalog fetch
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);
  const regionDistricts = useMemo(() => districts.filter((d) => d.region_id === regionId), [districts, regionId]);

  async function addDistrict(e: React.FormEvent) {
    e.preventDefault();
    try { await apiPost("/api/system/districts", { region_id: regionId, code: districtCode, names: { uz: districtName }, parent_district_id: parentId || null }); setDistrictCode(""); setDistrictName(""); setParentId(""); setMessage("Tuman qo'shildi"); await load(); } catch (err) { setMessage(err instanceof Error ? err.message : "Tuman qo'shib bo'lmadi"); }
  }
  async function addRegion(e: React.FormEvent) {
    e.preventDefault();
    try { await apiPost("/api/system/regions", { code: regionCode, names: { uz: regionName } }); setRegionCode(""); setRegionName(""); setMessage("Viloyat qo'shildi"); await load(); } catch (err) { setMessage(err instanceof Error ? err.message : "Viloyat qo'shib bo'lmadi"); }
  }
  async function addMfy(districtId: string) {
    const name = (mfyDraft[districtId] || "").trim(); if (!name) return;
    try { await apiPost("/api/system/neighborhoods", { district_id: districtId, name }); setMfyDraft((x) => ({ ...x, [districtId]: "" })); setMessage("MFY qo'shildi"); await load(); } catch (err) { setMessage(err instanceof Error ? err.message : "MFY qo'shib bo'lmadi"); }
  }
  async function toggleDistrict(d: District) { await apiPatch(`/api/system/districts/${d.id}`, { is_active: !d.is_active }); await load(); }
  async function toggleRegion(r: Region) { await apiPatch(`/api/system/regions/${r.id}`, { is_active: !r.is_active }); await load(); }
  async function toggleMfy(n: Neighborhood) { await apiPatch(`/api/system/neighborhoods/${n.id}`, { is_active: !n.is_active }); await load(); }

  return <AppShell title="Hududlar" requireRoles={["system_admin"]}>
    <div><p className="text-sm font-medium uppercase tracking-[0.16em] text-accent">Tizim boshqaruvi</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Tuman va MFYlar</h1><p className="mt-1 text-sm text-text-secondary">Yangi hudud qo&apos;shing, parent bog&apos;lang va MFY katalogini boshqaring.</p></div>
    {message && <Card className="border-accent text-sm text-text-primary">{message}</Card>}
    <div className="grid gap-4 lg:grid-cols-2"><Card><h2 className="text-lg font-semibold text-text-primary">Viloyat qo&apos;shish</h2><form onSubmit={addRegion} className="mt-4 grid gap-4 sm:grid-cols-3"><div><Label>Kod</Label><Input value={regionCode} onChange={(e) => setRegionCode(e.target.value)} placeholder="NAMANGAN" required /></div><div><Label>Nomi</Label><Input value={regionName} onChange={(e) => setRegionName(e.target.value)} placeholder="Namangan viloyati" required /></div><div className="flex items-end"><Button type="submit">Viloyat qo&apos;shish</Button></div></form></Card><Card><h2 className="text-lg font-semibold text-text-primary">Viloyatlar</h2><div className="mt-3 space-y-2">{regions.map((r) => <div key={r.id} className="flex items-center justify-between rounded-control border border-border px-3 py-2"><span className={r.is_active ? "text-text-primary" : "text-text-muted line-through"}>{r.names.uz || r.code}</span><button className="text-xs text-accent hover:underline" onClick={() => toggleRegion(r)}>{r.is_active ? "Faolsizlantirish" : "Faollashtirish"}</button></div>)}</div></Card></div>
    <Card><h2 className="text-lg font-semibold text-text-primary">Tuman qo&apos;shish</h2><form onSubmit={addDistrict} className="mt-4 grid gap-4 md:grid-cols-4"><div><Label>Viloyat</Label><select className="h-10 w-full rounded-control border border-border bg-bg-surface px-3 text-sm" value={regionId} onChange={(e) => setRegionId(e.target.value)} required>{regions.map((r) => <option key={r.id} value={r.id}>{r.names.uz || r.code}</option>)}</select></div><div><Label>Kod</Label><Input value={districtCode} onChange={(e) => setDistrictCode(e.target.value)} placeholder="MASALAN_TUMANI" required /></div><div><Label>Nomi</Label><Input value={districtName} onChange={(e) => setDistrictName(e.target.value)} placeholder="Yangi tuman" required /></div><div><Label>Parent hudud (ixtiyoriy)</Label><select className="h-10 w-full rounded-control border border-border bg-bg-surface px-3 text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">Mustaqil hudud</option>{regionDistricts.map((d) => <option key={d.id} value={d.id}>{d.names.uz || d.code}</option>)}</select></div><div className="md:col-span-4"><Button type="submit">Tuman qo&apos;shish</Button></div></form></Card>
    <div className="grid gap-4">{regionDistricts.map((d) => <Card key={d.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">{d.names.uz || d.code}</h2><p className="text-xs text-text-muted">{d.code}{d.parent_district_id ? " • parent hudud ichida" : " • mustaqil hudud"}</p></div><Button variant="secondary" onClick={() => toggleDistrict(d)}>{d.is_active ? "Faolsizlantirish" : "Faollashtirish"}</Button></div><div className="mt-4 space-y-2">{d.neighborhoods.map((n) => <div key={n.id} className="flex items-center justify-between rounded-control border border-border px-3 py-2 text-sm"><span className={n.is_active ? "text-text-primary" : "text-text-muted line-through"}>{n.name}</span><button className="text-xs text-accent hover:underline" onClick={() => toggleMfy(n)}>{n.is_active ? "Faolsizlantirish" : "Faollashtirish"}</button></div>)}{d.neighborhoods.length === 0 && <p className="text-sm text-text-muted">Hali MFY qo&apos;shilmagan.</p>}<div className="flex gap-2 pt-2"><Input value={mfyDraft[d.id] || ""} onChange={(e) => setMfyDraft((x) => ({ ...x, [d.id]: e.target.value }))} placeholder="Yangi MFY nomi" /><Button onClick={() => addMfy(d.id)}>MFY qo&apos;shish</Button></div></div></Card>)}</div>
  </AppShell>;
}
