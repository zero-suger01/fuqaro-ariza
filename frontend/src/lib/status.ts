import type { ComplaintCategory, ComplaintStatus } from "@/lib/types";

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  yangi: "Yangi",
  korib_chiqilmoqda: "Ko'rib chiqilmoqda",
  masul_tashkilotga_yuborildi: "Mas'ul tashkilotga yuborildi",
  jarayonda: "Jarayonda",
  hal_qilindi: "Hal qilindi",
  rad_etildi: "Rad etildi",
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  yangi: "var(--st-yangi)",
  korib_chiqilmoqda: "var(--st-korib-chiqilmoqda)",
  masul_tashkilotga_yuborildi: "var(--st-yuborildi)",
  jarayonda: "var(--st-jarayonda)",
  hal_qilindi: "var(--st-hal-qilindi)",
  rad_etildi: "var(--st-rad-etildi)",
};

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  chiqindi: "Chiqindi",
  yol: "Yo'l",
  elektr: "Elektr",
  gaz: "Gaz",
  suv: "Suv",
  daraxt: "Daraxt",
  ekologiya: "Ekologiya",
  qurilish: "Qurilish",
  obodonlashtirish: "Obodonlashtirish",
  boshqa: "Boshqa",
};
