import type { Metadata } from "next";
import { Manrope, Noto_Kufi_Arabic } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Visit Oman",
  description: "CodeStacker 2026 Frontend challenge implementation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${manrope.variable} ${notoKufiArabic.variable}`}>{children}</body>
    </html>
  );
}
