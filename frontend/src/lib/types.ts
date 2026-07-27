// --- Auth (docs/03-kontraktlar.md §4) ---

export type StaffRole = "department_staff" | "admin";

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
  department_name: string | null;
  /** v1.4 — `true` bo'lsa boshqa hech qayerga o'tmasdan parol almashtiriladi. */
  must_change_password?: boolean;
  /** v1.7 — profil rasmi (S3/MinIO). */
  avatar_url: string | null;
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
  transcript?: string | null;
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
  engine: "llm"; // v1.3: keyword dvigateli olib tashlandi
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

// R2: Tasdiqlash navbatida sub-taskni ochmasdan bekor qilish uchun
// (PATCH /subtasks/{id} bilan bir xil ruxsat qoidasi).
export interface OpenSubtaskBrief {
  id: string;
  department_id: string;
  department_name: string;
}

// R2: ro'yxat qatoridagi qisqa AI ma'lumoti (Navbatim / Tasdiqlash navbati)
export interface AiListBrief {
  summary: string | null;
  suggested_category: CategoryBrief | null;
  confidence: number | null;
  // v1.5 ko'p bo'limli murojaat ([07] §1.1) — AI yaratgan ochiq sub-tasklar
  // (bo'sh = sub-task yo'q).
  open_subtasks: OpenSubtaskBrief[];
}

export interface ComplaintListItem {
  id: string;
  ticket_number: string;
  status: ComplaintStatus;
  priority: Priority;
  category: CategoryBrief;
  citizen: CitizenBrief;
  neighborhood_name: string | null;
  department: DepartmentBrief | null;
  created_at: string;
  deadline_at: string | null;
  needs_review: boolean;
  ai: AiListBrief | null;
  description_snippet: string;
  // v1.4 — navbat «Mening ishlarim» / «Bo'lim navbati» ga bo'linishi uchun
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  info_requested_at: string | null;
}

// v1.4 — fuqarodan kelgan qo'shimcha ma'lumot (docs/03 §3.5)
export interface CitizenMessage {
  id: string;
  text: string;
  source: "web" | "telegram" | "manual";
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
}

// v1.4 — idoralararo topshiriq (docs/03 §5)
export interface Subtask {
  id: string;
  department_id: string;
  department_name: string;
  assigned_user_id: string | null;
  status: "open" | "done" | "cancelled";
  note: string;
  deadline_at: string | null;
  created_at: string;
  closed_at: string | null;
  /** v1.5 — AI ko'p bo'limli murojaatni o'zi bo'lgan (docs/07 §1.1). */
  created_by_ai: boolean;
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
  // v1.4 (docs/03 §5 detail qatori)
  assigned_user_name: string | null;
  accepted_at: string | null;
  info_requested_at: string | null;
  info_provided_at: string | null;
  /** Xodim `need_info` da so'ragan savol — fuqaro ko'radigan matn bilan bir xil. */
  info_request_text: string | null;
  citizen_messages: CitizenMessage[];
  subtasks: Subtask[];
  satisfaction: boolean | null;
  reopened_count: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface NeighborhoodStat {
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  count: number;
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
  /** Tekshirilganlar ichida AI to'g'ri topganlari ulushi (`reviewed`
   *  eventi, `reason == "ok"`). Foizni HAR DOIM `ai_reviewed_7d` bilan
   *  birga ko'rsating — namuna hajmisiz u chalg'itadi. */
  ai_accuracy_7d: number | null;
  /** Yuqoridagi foiz nechta tekshiruvdan chiqqani. 0 = hech kim
   *  tekshirmagan, ya'ni aniqlik haqida hech narsa deyish mumkin emas. */
  ai_reviewed_7d: number;
  by_neighborhood: NeighborhoodStat[];
  ai_auto_routed_7d: number;
  ai_routing_corrected_7d: number;
  // R0 avtomatlashtirish KPI (docs/03 §5)
  zero_touch_7d: number | null;
  draft_reply_share_7d: number | null;
  avg_first_action_hours_7d: number | null;
  resolved_with_reply_7d: number | null;
}

// GET /api/admin/audit-logs (docs/03 §5)
export interface AuditLogItem {
  id: string;
  user_id: string;
  user_fullname: string | null;
  action: string;
  entity: string;
  entity_id: string;
  meta: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

// v1.4 — GET /api/admin/stats/queues (docs/03 §5, docs/10 §10.1)
export interface DepartmentQueueRow {
  department_id: string;
  department_name: string;
  new: number;
  in_progress: number;
  sla_risk: number;
  overdue: number;
  unowned: number;
  wip_limit: number | null;
  over_limit: boolean;
}

export interface QueueStats {
  unassigned: number;
  ai_exceptions: number;
  sla_risk: number;
  overdue: number;
  awaiting_info: number;
  stuck_ai: number;
  by_department: DepartmentQueueRow[];
}

// R0/Q4 — GET /api/admin/stats/ai-health
export interface AiHealth {
  ollama_ok: boolean;
  model: string;
  last_llm_success_at: string | null;
  llm_queue_depth: number;
  llm_errors_1h: number;
  pending_analysis: number; // tahlil kutayotgan murojaatlar (v1.3)
  stt_ok: boolean;
}

// R0 — /api/notifications (docs/03 §5.1)
export interface NotificationItem {
  id: string;
  message: string;
  is_read: boolean;
  complaint_id: string | null;
  created_at: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface MapPoint {
  id: string;
  ticket_number: string;
  lat: number;
  lng: number;
  status: ComplaintStatus;
  priority: Priority;
  category_name: string;
}

export type KpiGroupBy = "department" | "user" | "neighborhood" | "category";

export interface KpiRow {
  key: string | null;
  label: string;
  total: number;
  resolved: number;
  avg_first_response_hours: number | null;
  avg_resolution_hours: number | null;
  sla_percent: number | null;
}

export interface AiTrendPoint {
  date: string;
  accuracy: number | null;
  low_confidence_share: number | null; // v1.3: eski llm_share o'rniga
}

export interface DepartmentAdmin {
  id: string;
  code: string;
  names: Record<string, string>;
  phone: string | null;
  email: string | null;
  is_external: boolean;
  is_active: boolean;
  /** v1.4 — bir vaqtda ola oladigan aktiv ish soni. Bloklamaydi, faqat belgi. */
  wip_limit: number | null;
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
  district: string | null;
  mfy: string | null;
  street: string | null;
  contact_name: string | null;
  note: string | null;
  scans: number;
  created_at: string;
  png_url: string;
  pdf_url: string;
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
  department: { code: string; name: string } | null; // R0/Q5 — mas'ul bo'lim
  created_at: string;
  deadline_at: string | null;
  timeline: TimelineStep[];
  reply_text: string | null;
  rejected_reason: string | null;
  // v1.4 (docs/03 §3.2/§3.5/§3.6)
  /** Xodimning savoli — fuqaro nima yuborishi kerakligini bilishi uchun. */
  info_request_text: string | null;
  info_provided: boolean;
  can_give_feedback: boolean;
  satisfaction: boolean | null;
}

// v1.4 — POST /api/public/complaints/info javobi
export interface CitizenInfoResponse {
  status_simple: TrackResponse["status_simple"];
  need_info: boolean;
  /** `true` — murojaat avtomatik «Ijroda» ga qaytdi. */
  accepted: boolean;
}

// v1.4 — POST /api/public/complaints/feedback javobi
export interface FeedbackResponse {
  status_simple: TrackResponse["status_simple"];
  reopened: boolean;
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
  // v1.7.2 — QR tuman/MFY/ko'chaga noyob, shuning uchun `/yangi` 2-qadam
  // manzilini avtomatik to'ldirish uchun (app/routers/public.py).
  district: string | null;
  mfy: string | null;
  street: string | null;
  address: string | null;
}

// --- Citizen kabinet (docs/03-kontraktlar.md §4, F3.3) ---

export interface CitizenComplaint {
  id: string;
  ticket_number: string;
  status_simple: "qabul_qilindi" | "korilmoqda" | "ijroda" | "yakunlandi" | "rad_etildi";
  category: { code: string; name: string };
  department: { code: string; name: string } | null;
  // Murojaatni shaxsan olib borayotgan xodim — faqat "qabul qildim"
  // belgilangach to'ldiriladi (app/routers/citizen.py).
  assigned_staff: { name: string; phone: string } | null;
  // Fuqaro yozgan matn; ovozli murojaatda backend transkriptsiya bilan
  // to'ldiradi (bu ro'yxatda ovoz ijro etilmaydi — app/routers/citizen.py).
  description: string;
  created_at: string;
  deadline_at: string | null;
}
