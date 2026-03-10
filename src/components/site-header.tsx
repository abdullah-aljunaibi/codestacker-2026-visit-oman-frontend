"use client";

import Link from "next/link";

import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/types/dataset";

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const nextLocale: Locale = locale === "en" ? "ar" : "en";

  return (
    <div className="localeSwitch" aria-label={messages.nav.switchLabel}>
      <Link className="pill localePill" href={`/${nextLocale}`}>
        {messages.locales[nextLocale]}
      </Link>
    </div>
  );
}

export function SiteHeader({
  locale,
  title
}: {
  locale: Locale;
  title?: string;
}) {
  const messages = getMessages(locale);

  return (
    <header className="topnav">
      <div className="topnavMain">
        <Link className="brand" href={`/${locale}`}>
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
