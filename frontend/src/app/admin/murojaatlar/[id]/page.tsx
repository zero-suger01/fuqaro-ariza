"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { MessageSquare, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Complaint, ComplaintStatus, Organization } from "@/lib/types";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

interface CommentItem {
  id: string;
  admin_id: string;
  comment: string;
  created_at: string;
}

export default function AdminComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | "">("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [saving, setSaving] = useState(false);

  function load() {
    apiGet<Complaint>(`/api/admin/complaints/${id}`).then((c) => {
      setComplaint(c);
      setSelectedStatus(c.status);
      setSelectedOrg(c.organization?.id ?? "");
      setComments(c.comments);
    });
  }

  useEffect(() => {
    load();
    apiGet<Organization[]>("/api/admin/organizations").then(setOrganizations);
  }, [id]);

  async function handleStatusChange() {
    if (!selectedStatus) return;
    setSaving(true);
    try {
      await apiPatch(`/api/admin/complaints/${id}/status`, { status: selectedStatus });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!selectedOrg) return;
    setSaving(true);
    try {
      await apiPost(`/api/admin/complaints/${id}/assign`, { organization_id: selectedOrg });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    try {
      const newComment = await apiPost<CommentItem>(`/api/admin/complaints/${id}/comments`, { comment });
      setComments((prev) => [newComment, ...prev]);
      setComment("");
    } finally {
      setSaving(false);
    }
  }

  if (!complaint) {
    return (
      <AppShell title="Murojaat tafsiloti" requireAdmin>
        <div className="py-10 text-center text-text-muted text-sm">Yuklanmoqda...</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Murojaat tafsiloti" requireAdmin>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
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
            <h2 className="text-base font-semibold text-text-primary mb-3">Foydalanuvchi matni</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{complaint.description}</p>
          </Card>

          {complaint.latitude && complaint.longitude && (
            <Card>
              <h2 className="text-base font-semibold text-text-primary mb-4">Joylashuv</h2>
              <MapPicker lat={complaint.latitude} lng={complaint.longitude} onChange={() => {}} />
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Izohlar</h2>
            </div>
            <form onSubmit={handleComment} className="flex gap-2 mb-4">
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Izoh yozing..."
                className="flex-1"
              />
              <Button type="submit" disabled={saving} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {comments.length === 0 ? (
              <p className="text-sm text-text-muted">Hozircha izohlar yo&apos;q</p>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-inner bg-bg-subtle px-4 py-3">
                    <p className="text-sm text-text-primary">{c.comment}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(c.created_at).toLocaleString("uz-UZ")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">Ma&apos;lumot</h2>
              <Badge label={STATUS_LABELS[complaint.status]} color={STATUS_COLORS[complaint.status]} />
            </div>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Foydalanuvchi kategoriyasi</dt>
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
              <div className="flex justify-between">
                <dt className="text-text-muted">Sana</dt>
                <dd className="text-text-primary font-medium">{new Date(complaint.created_at).toLocaleString("uz-UZ")}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Statusni o&apos;zgartirish</h2>
            <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)} className="mb-3">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button onClick={handleStatusChange} disabled={saving} className="w-full">
              Saqlash
            </Button>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Tashkilotga biriktirish</h2>
            <Label>Mas&apos;ul tashkilot</Label>
            <Select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="mb-3">
              <option value="">Tanlanmagan</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
            <Button onClick={handleAssign} disabled={saving} variant="secondary" className="w-full">
              Yuborish
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
