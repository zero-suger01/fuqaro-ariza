// Admin/xodim paneli — pilot rebrand (Plus Jakarta Sans + to'q sariq
// accent + deyarli qora sidebar). Faqat shu daraxt `.theme-admin` skinini
// oladi (globals.css) — fuqaro sahifalari ([locale]/*) tegilmaydi.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-admin">{children}</div>;
}
