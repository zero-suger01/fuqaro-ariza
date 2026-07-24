"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { clsx } from "clsx";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiDelete, apiGet, apiPost, ApiError } from "@/lib/api";
import type { CategoryAdmin, KeywordItem } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [selected, setSelected] = useState<CategoryAdmin | null>(null);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<CategoryAdmin[]>("/api/admin/categories").then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setSelected(cats[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    apiGet<KeywordItem[]>(`/api/admin/categories/${selected.id}/keywords`).then(setKeywords);
  }, [selected]);

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !newPhrase.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const keyword = await apiPost<KeywordItem>(`/api/admin/categories/${selected.id}/keywords`, {
        phrase: newPhrase,
        weight: 1,
      });
      setKeywords((prev) => [...prev, keyword]);
      setNewPhrase("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function removeKeyword(keyword: KeywordItem) {
    if (!selected) return;
    await apiDelete(`/api/admin/categories/${selected.id}/keywords/${keyword.id}`);
    setKeywords((prev) => prev.filter((k) => k.id !== keyword.id));
  }

  return (
    <AppShell title="Kategoriyalar" requireRoles={["admin"]}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-base font-semibold text-text-primary mb-4">Kategoriyalar</h2>
          <div className="flex flex-col gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelected(cat)}
                className={clsx(
                  "text-left rounded-inner px-3 py-2.5 text-sm transition",
                  selected?.id === cat.id ? "bg-accent-soft text-accent font-medium" : "text-text-primary hover:bg-bg-subtle"
                )}
              >
                {cat.names.uz ?? cat.code}
                {!cat.is_active && <span className="text-text-muted"> (nofaol)</span>}
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-text-primary">{selected.names.uz ?? selected.code}</h2>
                <span className="text-xs text-text-muted">SLA: {selected.sla_hours} soat</span>
              </div>
              <p className="text-xs text-text-muted mb-4">Kod: {selected.code}</p>

              <form onSubmit={addKeyword} className="flex gap-2 mb-4">
                <Input
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  placeholder="Yangi kalit so'z yoki ibora..."
                  className="flex-1"
                />
                <Button type="submit" disabled={saving || !newPhrase.trim()}>
                  <Plus className="h-4 w-4" /> Qo&apos;shish
                </Button>
              </form>
              {error && <p className="text-sm text-danger mb-3">{error}</p>}

              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span
                    key={kw.id}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-bg-subtle px-3 py-1.5 text-sm text-text-primary"
                  >
                    {kw.keyword_norm}
                    <span className="text-xs text-text-muted">({kw.source})</span>
                    {kw.source !== "seed" && (
                      <button type="button" onClick={() => removeKeyword(kw)} className="text-text-muted hover:text-danger">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {keywords.length === 0 && <p className="text-sm text-text-muted">Kalit so&apos;zlar yo&apos;q</p>}
              </div>
            </>
          ) : (
            <div className="py-14 text-center text-text-muted text-sm">Kategoriya tanlang</div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
