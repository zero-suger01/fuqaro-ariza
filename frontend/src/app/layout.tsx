import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

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
  themeColor: "#0f2744",
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
    <html lang="uz" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-app text-text-primary">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
