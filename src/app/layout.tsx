import type { Metadata } from "next";
import { Inter, Tajawal } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "700", "800"],
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
      <body className={`${inter.variable} ${tajawal.variable}`}>{children}</body>
    </html>
  );
}
