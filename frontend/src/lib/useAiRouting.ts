"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { TrackResponse } from "@/lib/types";

// AI (DeepSeek/Ollama, docs/07-ai-layer.md §3) submit'dan keyin worker'da
// ishlaydi — fuqaro kutmaydi (async, backend §3.1 kontrakti). Lekin natija
// odatda bir necha soniyada tayyor bo'lgani uchun "Murojaatingiz qabul
// qilindi!" ekrani AI natijasi bilan birga ko'rsatiladi (docs/10-ui-ux.md
// §2.9 — kutish tushuntiriladi). Vaqt tugasa AI hali javob bermagan
// bo'lishi mumkin (qayta urinish navbati, docs/07 §2) — bloklab
// qo'ymaslik uchun shunda ham "qabul qilindi" ekraniga o'tiladi, faqat
// bo'lim nomisiz.
//
// `track` IP bo'yicha 30/soat cheklangan (enumeration himoyasi, app/core/
// ratelimit.py) — bu poll shu endpointni chaqiradi, shuning uchun oyna
// tor: DeepSeek/Ollama odatda bir necha soniyada javob beradi (o'lchov:
// ~3-6 s), 20 s/2 s ≈ 11 so'rov bitta murojaatga.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20_000;

export type AiRoutingState =
  | { status: "polling" }
  | { status: "routed"; department: string }
  | { status: "timeout" };

export function useAiRouting(ticketNumber: string | null, phone: string | null): AiRoutingState {
  const [state, setState] = useState<AiRoutingState>({ status: "polling" });

  useEffect(() => {
    if (!ticketNumber || !phone) return;
    let cancelled = false;
    const params = new URLSearchParams({ ticket: ticketNumber, phone });
    const start = Date.now();

    async function poll() {
      while (!cancelled && Date.now() - start < POLL_TIMEOUT_MS) {
        try {
          const res = await apiGet<TrackResponse>(`/api/public/complaints/track?${params.toString()}`);
          if (res.department) {
            if (!cancelled) setState({ status: "routed", department: res.department.name });
            return;
          }
        } catch {
          // Tarmoq xatosi bo'lsa ham jim davom etamiz — keyingi urinish
          // muvaffaqiyatli bo'lishi mumkin, fuqaroga xato ko'rsatilmaydi.
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (!cancelled) setState({ status: "timeout" });
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [ticketNumber, phone]);

  return state;
}
