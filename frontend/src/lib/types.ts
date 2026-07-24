// --- Auth (docs/03-kontraktlar.md §4) ---

export type StaffRole = "operator" | "employee" | "manager" | "admin";

export interface AuthUser {
  kind: "citizen" | "staff";
  id: string;
  first_name: string | null;
  last_name: string | null;
  fullname: string;
  phone: string;
  email: string | null;
  role: StaffRole | null;
  department_id: string | null;
}

// --- Admin API (docs/03-kontraktlar.md §5) ---

export type ComplaintStatus =
  | "new"
  | "ai_processed"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "need_info"
  | "resolved"
  | "rejected"
  | "closed"
  | "archived";

export type Priority = "low" | "medium" | "high" | "critical";

export interface CategoryBrief {
  code: string;
  name: string;
}

export interface CitizenBrief {
  id: string;
  phone: string;
  fullname: string;
}

export interface DepartmentBrief {
  id: string;
  code: string;
  name: string;
}

export interface FileItem {
  id: string;
  kind: "image" | "video" | "audio" | "document";
  url: string;
  mime: string;
  size_bytes: number;
  duration_s: number | null;
}

export interface EventItem {
  id: string;
  event_type: string;
  actor_type: "citizen" | "staff" | "system" | "ai";
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AiAnalysisItem {
  engine: "keyword" | "llm";
  suggested_category: CategoryBrief | null;
  confidence: number | null;
  priority: Priority | null;
  sentiment: "negative" | "neutral" | "positive" | null;
  summary: string | null;
  suggested_reply: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface ReplyItem {
  id: string;
  text: string;
  channels: string[];
  sent_at: string;
}

export interface ComplaintListItem {
  id: string;
  ticket_number: string;
  status: ComplaintStatus;
  priority: Priority;
  category: CategoryBrief;
  citizen: CitizenBrief;
  neighborhood_name: string | null;
  created_at: string;
  deadline_at: string | null;
  needs_review: boolean;
}

export interface ComplaintDetail {
  id: string;
  ticket_number: string;
  status: ComplaintStatus;
  priority: Priority;
  source: string;
  language: string;
  description: string;
  category: CategoryBrief;
  citizen: CitizenBrief;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  neighborhood_name: string | null;
  department: DepartmentBrief | null;
  assigned_user_id: string | null;
  deadline_at: string | null;
  needs_review: boolean;
  rejected_reason: string | null;
  files: FileItem[];
  events: EventItem[];
  replies: ReplyItem[];
  ai: AiAnalysisItem | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  today: number;
  this_week: number;
  this_month: number;
  resolved: number;
  in_progress: number;
  overdue: number;
  needs_review: number;
  by_priority: Record<string, number>;
  ai_accuracy_7d: number | null;
}

export interface DepartmentAdmin {
  id: string;
  code: string;
  names: Record<string, string>;
  phone: string | null;
  email: string | null;
  is_external: boolean;
  is_active: boolean;
}

export interface CategoryAdmin {
  id: string;
  code: string;
  names: Record<string, string>;
  icon: string | null;
  sla_hours: number;
  department_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface QrCodeAdmin {
  id: string;
  code: string;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  note: string | null;
  scans: number;
  created_at: string;
  png_url: string;
  pdf_url: string;
}

export interface KeywordItem {
  id: string;
  keyword_norm: string;
  weight: number;
  source: "seed" | "admin" | "auto";
}

export interface SuggestionItem {
  id: string;
  phrase_norm: string;
  suggested_category: CategoryBrief | null;
  occurrences: number;
  sample_complaint_ids: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  fullname: string;
  phone: string;
  email: string | null;
  role: StaffRole;
  department_id: string | null;
  is_active: boolean;
}

// --- Guest/public API (docs/03-kontraktlar.md §3) — B1+ backend contract ---

export type LocaleCode = "uz" | "oz" | "ru" | "en";

export interface PublicCategory {
  code: string;
  name: string;
  icon: string | null;
}

export interface PublicNeighborhood {
  id: string;
  name: string;
}

export interface ComplaintSubmitResponse {
  id: string;
  ticket_number: string;
  status: string;
  status_simple: "qabul_qilindi" | "korilmoqda" | "ijroda" | "yakunlandi" | "rad_etildi";
  created_at: string;
  track_url: string;
}

export interface TimelineStep {
  step: "qabul_qilindi" | "korilmoqda" | "ijroda" | "yakunlandi";
  at: string | null;
  done: boolean;
}

export interface TrackResponse {
  ticket_number: string;
  status_simple: "qabul_qilindi" | "korilmoqda" | "ijroda" | "yakunlandi" | "rad_etildi";
  need_info: boolean;
  category: { code: string; name: string };
  created_at: string;
  deadline_at: string | null;
  timeline: TimelineStep[];
  reply_text: string | null;
  rejected_reason: string | null;
}

export interface SttJobCreated {
  job_id: string;
}

export interface SttJobStatus {
  status: "pending" | "done" | "failed";
  text: string | null;
  code: string | null;
}

export interface QrLanding {
  neighborhood_id: string | null;
  neighborhood_name: string | null;
}

// --- Citizen kabinet (docs/03-kontraktlar.md §4, F3.3) ---

export interface CitizenComplaint {
  id: string;
  ticket_number: string;
  status_simple: "qabul_qilindi" | "korilmoqda" | "ijroda" | "yakunlandi" | "rad_etildi";
  category: { code: string; name: string };
  created_at: string;
  deadline_at: string | null;
}
