"use client";

import { useEffect, useState } from "react";
import { Check, Lightbulb, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/api";
import type { SuggestionItem } from "@/lib/types";

export default function KeywordSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiGet<SuggestionItem[]>("/api/admin/keyword-suggestions?status=pending")
      .then(setSuggestions)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function decide(suggestion: SuggestionItem, action: "approve" | "reject") {
    setBusyId(suggestion.id);
    try {
      await apiPost(`/api/admin/keyword-suggestions/${suggestion.id}/${action}`);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Keyword takliflari" requireRoles={["admin"]}>
      <Card className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-accent shrink-0" />
        <p className="text-sm text-text-muted">
          LLM keyword topolmagan matnlardan har kuni chiqarilgan nomzod so&apos;zlar. Tasdiqlansa kategoriya lug&apos;atiga qo&apos;shiladi.
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Kutilayotgan takliflar</h2>
          <span className="text-sm text-text-muted">
            Jami <strong className="text-text-primary">{suggestions.length}</strong> ta
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : suggestions.length === 0 ? (
          <div className="py-14 text-center text-text-muted text-sm">Hozircha takliflar yo&apos;q</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    &ldquo;{s.phrase_norm}&rdquo; → {s.suggested_category?.name ?? "—"}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {s.occurrences} marta uchragan · {s.sample_complaint_ids.length} murojaatda
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    disabled={busyId === s.id}
                    onClick={() => decide(s, "reject")}
                  >
                    <X className="h-4 w-4" /> Rad etish
                  </Button>
                  <Button disabled={busyId === s.id} onClick={() => decide(s, "approve")}>
                    <Check className="h-4 w-4" /> Tasdiqlash
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
