"use client";

import { useEffect, useState } from "react";
import { Download, QrCode as QrCodeIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/formatDate";
import type { PublicNeighborhood, QrCodeAdmin } from "@/lib/types";

export default function QrCodesPage() {
  const [qrCodes, setQrCodes] = useState<QrCodeAdmin[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<PublicNeighborhood[]>([]);
  const [loading, setLoading] = useState(true);

  const [neighborhoodId, setNeighborhoodId] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiGet<QrCodeAdmin[]>("/api/admin/qr-codes")
      .then(setQrCodes)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    apiGet<PublicNeighborhood[]>("/api/public/neighborhoods").then(setNeighborhoods);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const qr = await apiPost<QrCodeAdmin>("/api/admin/qr-codes", {
        neighborhood_id: neighborhoodId || null,
        note: note.trim() || null,
      });
      setQrCodes((prev) => [qr, ...prev]);
      setNeighborhoodId("");
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="QR kodlar" requireRoles={["admin"]}>
      <Card className="flex items-center gap-3">
        <QrCodeIcon className="h-5 w-5 text-accent shrink-0" />
        <p className="text-sm text-text-muted">
          Mahallaga (yoki butun tumanga) QR yarating — plakat sifatida osib qo&apos;yish uchun PNG/PDF darhol
          tayyor bo&apos;ladi. Fuqaro QR&apos;ni skanerlaganda <code>/go</code> sahifasiga tushadi.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Yangi QR yaratish</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <Label>Mahalla (ixtiyoriy)</Label>
            <Select value={neighborhoodId} onChange={(e) => setNeighborhoodId(e.target.value)}>
              <option value="">Butun tuman (mahallasiz)</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Markaziy ko'cha plakati"
              maxLength={200}
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? "Yaratilmoqda..." : "Yaratish"}
          </Button>
        </form>
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Mavjud QR kodlar</h2>
          <span className="text-sm text-text-muted">
            Jami <strong className="text-text-primary">{qrCodes.length}</strong> ta
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : qrCodes.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Hozircha QR kod yo&apos;q</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {qrCodes.map((qr) => (
              <div key={qr.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {qr.neighborhood_name ?? "Butun tuman"}
                    {qr.note && <span className="text-text-muted"> — {qr.note}</span>}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    kod: <code>{qr.code}</code> · {qr.scans} ta skan · {formatDate(qr.created_at, "uz")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(qr.png_url, "_blank", "noopener,noreferrer")}
                  >
                    <Download className="h-4 w-4" /> PNG
                  </Button>
                  <Button type="button" onClick={() => window.open(qr.pdf_url, "_blank", "noopener,noreferrer")}>
                    <Download className="h-4 w-4" /> PDF plakat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
