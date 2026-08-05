import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

// F5.2 — PWA-lite + ijtimoiy ulashish. `manifest` va `appleWebApp`
// «Bosh ekranga qo'shish» uchun: qishloq foydalanuvchisi saytni ikon
// sifatida saqlab qo'ysa, keyingi murojaatda URL yozib o'tirmaydi.
export const metadata: Metadata = {
  title: {
    default: "Ariza — Fuqarolar murojaatlari platformasi",
    template: "%s · Ariza",
  },
  description: "Uychi tumani hokimligiga murojaat yuborish va holatini kuzatish. Ro'yxatdan o'tish shart emas.",
  applicationName: "Ariza",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ariza", statusBarStyle: "default" },
  formatDetection: { telephone: true },
  openGraph: {
    type: "website",
    siteName: "Ariza",
    title: "Ariza — murojaatingizni 3 daqiqada yuboring",
    description: "Muammoni yozing yoki ovoz bilan aytib qoldiring. Ro'yxatdan o'tish shart emas.",
    locale: "uz_UZ",
  },
  twitter: { card: "summary" },
};

export const viewport = {
  themeColor: "#0a1730",
  width: "device-width",
  initialScale: 1,
  // Keksa foydalanuvchi matnni kattalashtira olishi kerak (docs/10 §8).
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before first paint — avoids a light-mode
         * flash on load for citizens who picked dark. Inline + synchronous
         * on purpose; a useEffect-based toggle would run after paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-app text-text-primary">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
