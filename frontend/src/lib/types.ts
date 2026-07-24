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
