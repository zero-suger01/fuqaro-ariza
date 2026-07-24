"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ImagePlus, X, LocateFixed, Map as MapIcon, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Label, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiPost, apiPostForm, ApiError } from "@/lib/api";
import type { AIAnalyzeResponse, Complaint } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/status";
import type { ComplaintCategory } from "@/lib/types";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const MIN_LENGTH = 20;
const TASHKENT: [number, number] = [41.2995, 69.2401];

interface AIAnalyzeReq {
  description: string;
  image_ids: string[];
}

export default function NewComplaintPage() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [aiResult, setAiResult] = useState<AIAnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [coords, setCoords] = useState<[number, number]>(TASHKENT);
  const [locationMode, setLocationMode] = useState<"none" | "gps" | "map">("none");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing object URLs (external browser API) to state
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const runAnalysis = useCallback((text: string) => {
    if (text.trim().length < MIN_LENGTH) {
      setAiResult(null);
      return;
    }
    setAnalyzing(true);
    apiPost<AIAnalyzeResponse>("/api/ai/analyze", { description: text, image_ids: [] } as AIAnalyzeReq)
      .then((res) => {
        setAiResult(res);
        setCategory((prev) => (prev ? prev : res.category));
      })
      .catch(() => setAiResult(null))
      .finally(() => setAnalyzing(false));
  }, []);

  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runAnalysis(value), 600);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function useGps() {
    setLocationMode("gps");
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords([pos.coords.latitude, pos.coords.longitude]),
      () => setError("GPS orqali joylashuvni aniqlab bo'lmadi")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (description.trim().length < MIN_LENGTH) {
      setError(`Murojaat matni kamida ${MIN_LENGTH} ta belgidan iborat bo'lishi kerak`);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("description", description);
      if (category) formData.append("category", category);
      if (locationMode !== "none") {
        formData.append("latitude", String(coords[0]));
        formData.append("longitude", String(coords[1]));
      }
      if (address) formData.append("address", address);
      if (district) formData.append("district", district);
      if (neighborhood) formData.append("neighborhood", neighborhood);
      images.forEach((file) => formData.append("images", file));

      const complaint = await apiPostForm<Complaint>("/api/complaints", formData);
      router.push(`/murojaatlarim/${complaint.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Murojaatni yuborishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Ariza yuborish">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Rasmlar</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-inner overflow-hidden border border-border group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`rasm ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-inner border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-text-muted cursor-pointer hover:border-accent hover:text-accent transition">
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Yuklash</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Murojaat matni</h2>
            <Textarea
              rows={5}
              placeholder="Muammoni batafsil tasvirlab bering..."
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />
            <p className={`text-xs mt-1.5 ${description.length < MIN_LENGTH ? "text-danger" : "text-text-muted"}`}>
              {description.length}/{MIN_LENGTH} minimal belgi
            </p>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">AI Analiz</h2>
            </div>

            {analyzing && <p className="text-sm text-text-muted">Tahlil qilinmoqda...</p>}

            {!analyzing && aiResult && (
              <div className="flex items-center gap-3 mb-4 rounded-inner bg-accent-soft px-4 py-3">
                <div>
                  <p className="text-xs text-text-secondary">Kategoriya</p>
                  <p className="text-sm font-semibold text-text-primary">{CATEGORY_LABELS[aiResult.category]}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-text-secondary">Ishonchlilik</p>
                  <p className="text-sm font-semibold text-accent-hover font-mono">
                    {Math.round(aiResult.confidence * 100)}%
                  </p>
                </div>
              </div>
            )}

            {!analyzing && !aiResult && (
              <p className="text-sm text-text-muted mb-4">
                Kategoriyani aniqlash uchun murojaat matnini kiriting (kamida {MIN_LENGTH} belgi)
              </p>
            )}

            <Label>Kategoriya (kerak bo&apos;lsa o&apos;zgartiring)</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
              <option value="">Tanlanmagan</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Joylashuv</h2>
            <div className="flex gap-2 mb-4">
              <Button type="button" variant={locationMode === "gps" ? "primary" : "secondary"} onClick={useGps} className="flex-1">
                <LocateFixed className="h-4 w-4" /> GPS orqali
              </Button>
              <Button
                type="button"
                variant={locationMode === "map" ? "primary" : "secondary"}
                onClick={() => setLocationMode("map")}
                className="flex-1"
              >
                <MapIcon className="h-4 w-4" /> Xaritadan
              </Button>
            </div>

            {locationMode === "map" && (
              <div className="mb-4">
                <MapPicker lat={coords[0]} lng={coords[1]} onChange={(lat, lng) => setCoords([lat, lng])} />
              </div>
            )}

            {locationMode !== "none" && (
              <p className="text-xs text-text-muted mb-4 font-mono">
                {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <Label>Manzil</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ko'cha, uy raqami..." />
              </div>
              <div>
                <Label>Tuman</Label>
                <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Masalan: Chilonzor" />
              </div>
              <div>
                <Label>Mahalla</Label>
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Mahalla nomi" />
              </div>
            </div>
          </Card>

          {error && (
            <Card className="border-danger/40">
              <p className="text-sm text-danger">{error}</p>
            </Card>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
