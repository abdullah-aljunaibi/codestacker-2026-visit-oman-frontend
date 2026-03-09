import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visit Oman",
  description: "CodeStacker 2026 Frontend challenge implementation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
