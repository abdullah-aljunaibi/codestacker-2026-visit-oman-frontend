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

const localeBootstrapScript = `
  (function () {
    var segment = window.location.pathname.split("/")[1];
    var isArabic = segment === "ar";
    document.documentElement.lang = isArabic ? "ar" : "en";
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeBootstrapScript }} />
      </head>
      <body className={`${manrope.variable} ${notoKufiArabic.variable}`}>{children}</body>
    </html>
  );
}
