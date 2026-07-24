"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, Flame } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/status";
import type { CategoryAdmin, ComplaintStatus, HeatmapPoint, MapPoint } from "@/lib/types";

const ComplaintsMap = dynamic(() => import("@/components/admin/ComplaintsMap"), { ssr: false });

export default function MapDashboardPage() {
  const [mode, setMode] = useState<"cluster" | "heatmap">("cluster");
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<CategoryAdmin[]>("/api/admin/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    if (mode === "cluster") {
      apiGet<MapPoint[]>(`/api/admin/stats/map-points?${params.toString()}`)
        .then(setPoints)
        .finally(() => setLoading(false));
    } else {
      apiGet<HeatmapPoint[]>(`/api/admin/stats/heatmap?${params.toString()}`)
        .then(setHeatmapPoints)
        .finally(() => setLoading(false));
    }
  }, [mode, category, status, dateFrom, dateTo]);

  return (
    <AppShell title="Xarita">
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Sanadan</Label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-control border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition"
            />
          </div>
          <div>
            <Label>Sanagacha</Label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-control border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition"
            />
          </div>
          <div>
            <Label>Kategoriya</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Barchasi</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.names.uz ?? c.code}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Holat</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)}>
              <option value="">Barchasi</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 lg:col-span-2">
            <Button
              type="button"
              variant={mode === "cluster" ? "primary" : "secondary"}
              className="flex-1"
              onClick={() => setMode("cluster")}
            >
              <MapIcon className="h-4 w-4" /> Markerlar
            </Button>
            <Button
              type="button"
              variant={mode === "heatmap" ? "primary" : "secondary"}
              className="flex-1"
              onClick={() => setMode("heatmap")}
            >
              <Flame className="h-4 w-4" /> Issiqlik xaritasi
            </Button>
          </div>
        </div>
      </Card>

      <Card className="relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-bg-surface/70 text-sm text-text-muted rounded-card">
            Yuklanmoqda...
          </div>
        )}
        <ComplaintsMap mode={mode} points={points} heatmapPoints={heatmapPoints} />
        <p className="mt-3 text-sm text-text-muted">
          {mode === "cluster"
            ? `${points.length} ta koordinatali murojaat ko'rsatilmoqda (eng so'nggi 2000 tagacha).`
            : "Nuqta zichligi shu hududda qancha murojaat kelganini ko'rsatadi."}
        </p>
      </Card>
    </AppShell>
  );
}
