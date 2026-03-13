"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/types/dataset";

const tabs = [
  { key: "home", path: "" },
  { key: "discover", path: "/discover" },
  { key: "planner", path: "/planner" },
  { key: "saved", path: "/saved" }
] as const;

export function MobileCtaBar({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const pathname = usePathname() ?? "";

  return (
    <div className="mobileCtaBar">
      <nav className="mobileCtaBarInner" aria-label={messages.nav.mainLabel}>
        {tabs.map((tab) => {
          const href = `/${locale}${tab.path}`;
          const isActive =
            tab.key === "home"
              ? pathname === `/${locale}` || pathname === `/${locale}/`
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.key}
              className={`mobileTab${isActive ? " mobileTabActive" : ""}`}
              href={href}
            >
              {messages.nav[tab.key]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
