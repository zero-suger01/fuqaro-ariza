"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, QrCode as QrCodeIcon, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiDelete, apiGet, apiPost, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/formatDate";
import { districtNames, mfyNames, streetNames } from "@/lib/qrLocations";
import type { QrCodeAdmin } from "@/lib/types";

interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  inputProps,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dropdown yopilganda input qiymatini tanlangan qiymatga qaytarish
    if (!open) setQuery(value);
  }, [open, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const exactMatch = useMemo(
    () => filtered.some((o) => o.toLowerCase() === query.trim().toLowerCase()),
    [filtered, query]
  );

  const showAddOption = query.trim() && !exactMatch;

  function selectOption(option: string) {
    onChange(option);
    setQuery(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showAddOption) {
        selectOption(query.trim());
      } else if (filtered.length === 1) {
        selectOption(filtered[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
          autoComplete="off"
          {...inputProps}
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-control border border-border bg-bg-surface shadow-lg">
          {filtered.length === 0 && !showAddOption && (
            <li className="px-3.5 py-2 text-sm text-text-muted">Natija topilmadi</li>
          )}
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                className="w-full px-3.5 py-2 text-left text-sm text-text-primary hover:bg-bg-subtle transition"
              >
                {option}
              </button>
            </li>
          ))}
          {showAddOption && (
            <li className="border-t border-border">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(query.trim())}
                className="w-full px-3.5 py-2 text-left text-sm text-accent hover:bg-bg-subtle transition"
              >
                + qo&apos;shish: {query.trim()}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function QrCodesView() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [qrCodes, setQrCodes] = useState<QrCodeAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [district, setDistrict] = useState("");
  const [mfy, setMfy] = useState("");
  const [street, setStreet] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiGet<QrCodeAdmin[]>("/api/admin/qr-codes")
      .then(setQrCodes)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  // Tuman/MFY/ko'cha ro'yxati statik `qrLocations.ts` ma'lumotlari BILAN
  // BIRGA — admin "+ qo'shish" orqali yangi nom kiritib QR yaratganda, shu
  // nom keyingi safar ham dropdown'da ko'rinishi kerak (mijoz so'ragan).
  // Alohida saqlash joyi kerak emas: yaratilgan har bir QR o'zining
  // tuman/mfy/ko'chasini bazada saqlaydi, shu sabab allaqachon yuklangan
  // `qrCodes` ro'yxatidan chiqarib olinadi.
  const districts = useMemo(() => {
    const fromQr = qrCodes.map((q) => q.district).filter((v): v is string => !!v);
    return Array.from(new Set([...districtNames(), ...fromQr])).sort();
  }, [qrCodes]);

  const mfys = useMemo(() => {
    if (!district) return [];
    const fromQr = qrCodes
      .filter((q) => q.district === district)
      .map((q) => q.mfy)
      .filter((v): v is string => !!v);
    return Array.from(new Set([...mfyNames(district), ...fromQr])).sort();
  }, [district, qrCodes]);

  const streets = useMemo(() => {
    if (!district || !mfy) return [];
    const fromQr = qrCodes
      .filter((q) => q.district === district && q.mfy === mfy)
      .map((q) => q.street)
      .filter((v): v is string => !!v);
    return Array.from(new Set([...streetNames(district, mfy), ...fromQr])).sort();
  }, [district, mfy, qrCodes]);

  // Topbar qidiruvi (mijoz so'ragan: har bo'limda o'ziga tegishlisini
  // qidirsin) — tuman/MFY/ko'cha/kod/izoh bo'yicha mahalliy filtr.
  const visibleQrCodes = useMemo(() => {
    if (!searchQuery) return qrCodes;
    return qrCodes.filter((qr) =>
      [qr.district, qr.mfy, qr.street, qr.code, qr.note, qr.neighborhood_name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(searchQuery))
    );
  }, [qrCodes, searchQuery]);

  function handleDistrictChange(value: string) {
    setDistrict(value);
    setMfy("");
    setStreet("");
  }

  function handleMfyChange(value: string) {
    setMfy(value);
    setStreet("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!district.trim() || !mfy.trim() || !street.trim()) {
      setError("Tuman, MFY va ko'cha to'ldirilishi shart");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const qr = await apiPost<QrCodeAdmin>("/api/admin/qr-codes", {
        district: district.trim() || null,
        mfy: mfy.trim() || null,
        street: street.trim() || null,
        note: note.trim() || null,
      });
      setQrCodes((prev) => [qr, ...prev]);
      setDistrict("");
      setMfy("");
      setStreet("");
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(qr: QrCodeAdmin) {
    if (!window.confirm(`"${locationLabel(qr)}" QR kodini o'chirmoqchimisiz?`)) return;
    setDeletingId(qr.id);
    try {
      await apiDelete(`/api/admin/qr-codes/${qr.id}`);
      setQrCodes((prev) => prev.filter((q) => q.id !== qr.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setDeletingId(null);
    }
  }

  function locationLabel(qr: QrCodeAdmin) {
    const parts = [qr.district, qr.mfy, qr.street].filter(Boolean);
    return parts.length ? parts.join(" — ") : qr.neighborhood_name ?? "Butun tuman";
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
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <Label>Tuman nomi</Label>
            <SearchableSelect
              value={district}
              onChange={handleDistrictChange}
              options={districts}
              placeholder="Tumanni tanlang yoki yozing"
            />
          </div>
          <div>
            <Label>MFY nomi</Label>
            <SearchableSelect
              value={mfy}
              onChange={handleMfyChange}
              options={mfys}
              placeholder={district ? "MFY ni tanlang yoki yozing" : "Avval tumanni tanlang"}
              disabled={!district}
            />
          </div>
          <div>
            <Label>Ko&apos;cha nomi</Label>
            <SearchableSelect
              value={street}
              onChange={setStreet}
              options={streets}
              placeholder={mfy ? "Ko'chani tanlang yoki yozing" : "Avval MFY ni tanlang"}
              disabled={!mfy}
            />
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
            Jami <strong className="text-text-primary">{visibleQrCodes.length}</strong> ta
            {searchQuery && ` (${qrCodes.length} tadan filtrlangan)`}
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : qrCodes.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Hozircha QR kod yo&apos;q</div>
        ) : visibleQrCodes.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Qidiruvga mos QR kod topilmadi</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {visibleQrCodes.map((qr) => (
              <div key={qr.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {locationLabel(qr)}
                    {qr.note && <span className="text-text-muted"> — {qr.note}</span>}
                  </p>
                  {qr.contact_name && (
                    <p className="text-xs text-text-secondary mt-0.5">Mas&apos;ul: {qr.contact_name}</p>
                  )}
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
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleDelete(qr)}
                    disabled={deletingId === qr.id}
                    aria-label="QR kodni o'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
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

/** `useSearchParams()` Suspense chegarasini talab qiladi (Next.js 16). */
export default function QrCodesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Yuklanmoqda...</div>}>
      <QrCodesView />
    </Suspense>
  );
}
