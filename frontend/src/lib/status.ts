import type { ComplaintStatus, Priority } from "@/lib/types";

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  new: "Qabul qilindi",
  ai_processed: "AI tahlil qildi",
  assigned: "Bo'limga yo'naltirildi",
  accepted: "Bo'lim qabul qildi",
  in_progress: "Ijroda",
  need_info: "Ma'lumot kutilmoqda",
  resolved: "Hal qilindi",
  rejected: "Rad etildi",
  closed: "Yopildi",
  archived: "Arxivlandi",
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  new: "var(--info)",
  ai_processed: "var(--purple)",
  assigned: "var(--st-yuborildi)",
  accepted: "var(--st-yuborildi)",
  in_progress: "var(--warning)",
  need_info: "var(--warning)",
  resolved: "var(--success)",
  rejected: "var(--danger)",
  closed: "var(--text-muted)",
  archived: "var(--text-muted)",
};

// docs/03-kontraktlar.md §2.1 allowed transitions.
// `resolved`/`closed` -> `in_progress` bu yerda YO'Q: u faqat fuqaro
// e'tirozi bilan bajariladi (backend `CITIZEN_ONLY_TRANSITIONS`), xodim
// uchun tugma ko'rinmasligi kerak.
export const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  new: ["ai_processed", "rejected"],
  ai_processed: ["assigned", "rejected"],
  assigned: ["accepted", "in_progress", "need_info", "rejected"],
  accepted: ["in_progress", "need_info", "rejected"],
  in_progress: ["need_info", "resolved"],
  need_info: ["in_progress"],
  resolved: ["closed"],
  rejected: [],
  closed: ["archived"],
  archived: [],
};

// v1.4 — idoralararo topshiriq holati (docs/03 §5)
export const SUBTASK_STATUS_LABELS: Record<string, string> = {
  open: "Ochiq",
  done: "Bajarildi",
  cancelled: "Bekor qilindi",
};

// v1.4 — fuqaro javob kanali (docs/03 §3.5, [04] citizen_messages)
export const CITIZEN_INFO_SOURCE_LABELS: Record<string, string> = {
  web: "Sayt orqali",
  telegram: "Telegram orqali",
  manual: "Xodim yozib qo'ydi",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Past",
  medium: "O'rta",
  high: "Yuqori",
  critical: "Kritik",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "var(--text-muted)",
  medium: "var(--info)",
  high: "var(--warning)",
  critical: "var(--danger)",
};

export const ROLE_LABELS: Record<string, string> = {
  department_staff: "Bo'lim vakili",
  admin: "Administrator",
};

// Per-role allowed status targets (docs/03-kontraktlar.md §5 RBAC matrix,
// mirrored from backend/app/routers/admin.py ROLE_ALLOWED_STATUSES).
export const ROLE_ALLOWED_STATUSES: Record<string, ComplaintStatus[] | null> = {
  department_staff: ["accepted", "in_progress", "need_info", "resolved", "rejected", "closed"],
  admin: null,
};

// docs/03-kontraktlar.md §8
export const EVENT_LABELS: Record<string, string> = {
  created: "Murojaat yaratildi",
  ai_processed: "AI tahlil qildi",
  status_changed: "Holat o'zgardi",
  assigned: "Bo'limga biriktirildi",
  comment_added: "Ichki izoh",
  reply_sent: "Rasmiy javob yuborildi",
  info_requested: "Ma'lumot so'raldi",
  sms_sent: "SMS yuborildi",
  telegram_sent: "Telegram xabar yuborildi",
  escalated: "Eskalatsiya qilindi",
  sla_warning: "SLA ogohlantirishi",
  reviewed: "AI nazoratdan o'tdi",
  // v1.4 (docs/03 §8)
  info_provided: "Fuqaro ma'lumot yubordi",
  claimed: "Xodim qabul qildi",
  reopened: "Fuqaro e'tirozi bilan qayta ochildi",
  feedback_received: "Fuqaro baho berdi",
  subtask_created: "Idoralararo topshiriq berildi",
  subtask_closed: "Idoralararo topshiriq yopildi",
};

export const ACTOR_LABELS: Record<string, string> = {
  citizen: "Fuqaro",
  staff: "Xodim",
  system: "Tizim",
  ai: "AI",
};
