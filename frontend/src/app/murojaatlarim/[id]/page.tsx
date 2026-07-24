"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { apiGet } from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    apiGet<Complaint>(`/api/complaints/${id}`).then(setComplaint);
  }, [id]);

  return (
    <AppShell title="Murojaat tafsiloti">
      {!complaint ? (
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <h2 className="text-base font-semibold text-text-primary mb-6">Holat</h2>
              <StatusTimeline status={complaint.status} />
            </Card>

            {complaint.images.length > 0 && (
              <Card>
                <h2 className="text-base font-semibold text-text-primary mb-4">Rasmlar</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {complaint.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.image_url}
                      alt="murojaat rasmi"
                      className="aspect-square object-cover rounded-inner border border-border"
                    />
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h2 className="text-base font-semibold text-text-primary mb-3">Murojaat matni</h2>
              <p className="text-sm text-text-secondary leading-relaxed">{complaint.description}</p>
            </Card>

            {complaint.images.length === 0 && null}
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-text-primary">Ma&apos;lumot</h2>
                <Badge label={STATUS_LABELS[complaint.status]} color={STATUS_COLORS[complaint.status]} />
              </div>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Kategoriya</dt>
                  <dd className="text-text-primary font-medium">{CATEGORY_LABELS[complaint.category]}</dd>
                </div>
                {complaint.ai_category && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">AI aniqlagan</dt>
                    <dd className="text-text-primary font-medium">
                      {CATEGORY_LABELS[complaint.ai_category]}
                      {complaint.confidence ? ` (${Math.round(complaint.confidence * 100)}%)` : ""}
                    </dd>
                  </div>
                )}
                {complaint.organization && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Mas&apos;ul tashkilot</dt>
                    <dd className="text-text-primary font-medium text-right">{complaint.organization.name}</dd>
                  </div>
                )}
                {complaint.district && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Tuman</dt>
                    <dd className="text-text-primary font-medium">{complaint.district}</dd>
                  </div>
                )}
                {complaint.neighborhood && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Mahalla</dt>
                    <dd className="text-text-primary font-medium">{complaint.neighborhood}</dd>
                  </div>
                )}
                {complaint.address && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Manzil</dt>
                    <dd className="text-text-primary font-medium text-right">{complaint.address}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-text-muted">Sana</dt>
                  <dd className="text-text-primary font-medium">
                    {new Date(complaint.created_at).toLocaleString("uz-UZ")}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
