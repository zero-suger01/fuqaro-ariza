"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Table, type Column } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import type { AuditLogItem, Page, StaffUser } from "@/lib/types";

const PAGE_SIZE = 30;

const ACTION_LABELS: Record<string, string> = {
  create: "Yaratdi",
  update: "O'zgartirdi",
  delete: "O'chirdi",
  status: "Holatni o'zgartirdi",
  assign: "Biriktirdi",
  claim: "Qabul qildi",
  review: "AI nazoratdan o'tkazdi",
  replies: "Javob yubordi",
  comments: "Ichki izoh qoldirdi",
  "citizen-info": "Fuqaro javobini yozdi",
  subtasks: "Topshiriq berdi",
};

const ENTITY_LABELS: Record<string, string> = {
  complaints: "Murojaat",
  departments: "Bo'lim",
  categories: "Kategoriya",
  users: "Xodim",
  subtasks: "Topshiriq",
  "qr-codes": "QR kod",
};

/**
 * `audit_logs` jadvali va endpointi B4.6 dan beri bor edi, lekin UI yo'q
 * edi — ya'ni «kim nima qilgan» ma'lumoti amalda hech kimga ko'rinmasdi
 * (docs/06 S2.9).
 */
export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [userId, setUserId] = useState("");
  const [entity, setEntity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    apiGet<StaffUser[]>("/api/admin/users").then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (userId) params.set("user_id", userId);
    if (entity) params.set("entity", entity);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    apiGet<Page<AuditLogItem>>(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, userId, entity, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: Column<AuditLogItem>[] = [
    {
      key: "created_at",
      header: "Vaqt",
      render: (row) => (
        <span className="whitespace-nowrap">{new Date(row.created_at).toLocaleString("uz-UZ")}</span>
      ),
    },
    {
      key: "user",
      header: "Xodim",
      render: (row) => <span className="text-text-primary font-medium">{row.user_fullname ?? "—"}</span>,
    },
    { key: "action", header: "Amal", render: (row) => ACTION_LABELS[row.action] ?? row.action },
    {
      key: "entity",
      header: "Obyekt",
      render: (row) =>
        row.entity === "complaints" ? (
          <Link href={`/admin/murojaatlar/${row.entity_id}`} className="text-accent hover:underline">
            Murojaat
          </Link>
        ) : (
          (ENTITY_LABELS[row.entity] ?? row.entity)
        ),
    },
    {
      key: "meta",
      header: "Tafsilot",
      render: (row) =>
        row.meta ? (
          <code className="text-xs text-text-muted break-all">{JSON.stringify(row.meta).slice(0, 120)}</code>
        ) : (
          "—"
        ),
    },
    { key: "ip", header: "IP", render: (row) => <span className="text-xs text-text-muted">{row.ip ?? "—"}</span> },
  ];

  return (
    <AppShell title="Audit log" requireRoles={["district_admin", "system_admin"]}>
      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <Label>Xodim</Label>
            <Select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Barchasi</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullname}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Obyekt</Label>
            <Select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Barchasi</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Sanadan</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label>Sanagacha</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-sm text-text-muted pb-2.5">
            Jami <strong className="text-text-primary">{total}</strong> yozuv
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-text-primary">Xodimlar harakatlari</h2>
        </div>
        {loading ? (
          <div className="py-14 text-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : (
          <Table columns={columns} rows={rows} rowKey={(row) => row.id} empty="Yozuv topilmadi" />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Oldingi
            </Button>
            <span className="text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Keyingi
            </Button>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
