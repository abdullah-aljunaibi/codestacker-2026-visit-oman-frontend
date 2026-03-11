"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/types/dataset";

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const nextLocale: Locale = locale === "en" ? "ar" : "en";
  const pathname = usePathname();
  const localizedPath = pathname ? pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${nextLocale}`) : `/${nextLocale}`;

  return (
    <div className="localeSwitch" aria-label={messages.nav.switchLabel}>
      <Link className="pill localePill" href={localizedPath}>
        {messages.locales[nextLocale]}
      </Link>
    </div>
  );
}

export function SiteHeader({
  locale,
  title,
  overlay = false
}: {
  locale: Locale;
  title?: string;
  overlay?: boolean;
}) {
  const messages = getMessages(locale);
  const [isSolid, setIsSolid] = useState(!overlay);

  useEffect(() => {
    if (!overlay) {
      return undefined;
    }

    const sentinel = document.getElementById("hero-observer-sentinel");

    if (!sentinel) {
      setIsSolid(window.scrollY > 56);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSolid(!entry.isIntersecting);
      },
      {
        rootMargin: "-64px 0px 0px 0px",
        threshold: 0
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [overlay]);

  return (
    <header
      className={[
        "topnav",
        "siteChrome",
        overlay ? "siteChromeOverlay" : "",
        isSolid ? "siteChromeSolid" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="topnavMain">
        <Link className="brand brandLockup" href={`/${locale}`}>
          <span className="brandMark" aria-hidden="true" />
          {title ?? messages.app.title}
        </Link>
        <nav className="navlinks" aria-label={messages.nav.mainLabel}>
          <Link href={`/${locale}`}>{messages.nav.home}</Link>
          <Link href={`/${locale}/discover`}>{messages.nav.discover}</Link>
          <Link href={`/${locale}/planner`}>{messages.nav.planner}</Link>
          <Link href={`/${locale}/saved`}>{messages.nav.saved}</Link>
        </nav>
      </div>
      <LocaleSwitcher locale={locale} />
    </header>
  );
}
