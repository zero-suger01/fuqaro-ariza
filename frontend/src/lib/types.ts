export type ComplaintCategory =
  | "chiqindi"
  | "yol"
  | "elektr"
  | "gaz"
  | "suv"
  | "daraxt"
  | "ekologiya"
  | "qurilish"
  | "obodonlashtirish"
  | "boshqa";

export type ComplaintStatus =
  | "yangi"
  | "korib_chiqilmoqda"
  | "masul_tashkilotga_yuborildi"
  | "jarayonda"
  | "hal_qilindi"
  | "rad_etildi";

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  fullname: string;
  phone: string;
  email: string | null;
  role: UserRole;
}

export interface ComplaintImage {
  id: string;
  image_url: string;
}

export interface Organization {
  id: string;
  name: string;
  category: string;
}

export interface Comment {
  id: string;
  admin_id: string;
  comment: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  title: string | null;
  description: string;
  category: ComplaintCategory;
  ai_category: ComplaintCategory | null;
  confidence: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  status: ComplaintStatus;
  organization: Organization | null;
  images: ComplaintImage[];
  comments: Comment[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface DashboardStats {
  today: number;
  this_week: number;
  this_month: number;
  resolved: number;
  in_progress: number;
}

export interface AIAnalyzeResponse {
  category: ComplaintCategory;
  confidence: number;
  recommended_organizations: string[];
}

export interface StatsResponse {
  monthly: { month: string; count: number }[];
  by_category: { category: string; count: number }[];
  resolution_time: { average_hours: number | null; resolved_count: number };
  top_issues: { category: string; count: number }[];
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
