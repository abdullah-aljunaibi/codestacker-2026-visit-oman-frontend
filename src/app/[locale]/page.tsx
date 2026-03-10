import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { getRegionOptions } from "@/lib/data/selectors";
import { resolveLocale } from "@/lib/i18n/config";
import { formatMessage, getMessages } from "@/lib/i18n/messages";

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const messages = getMessages(locale);
  const destinations = loadDestinations();
  const regions = getRegionOptions(destinations, locale).map((option) => option.label);

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />

        <section className="hero">
          <span className="kicker">{messages.home.heroKicker}</span>
          <h1>{messages.home.heroTitle}</h1>
          <p>{messages.home.heroBody}</p>
          <div className="ctaRow">
            <Link className="pill pillPrimary" href={`/${locale}/discover`}>
              {messages.home.ctaPrimary}
            </Link>
            <Link className="pill" href={`/${locale}/planner`}>
              {messages.home.ctaSecondary}
            </Link>
          </div>
        </section>

        <section className="infoGrid">
          <article className="card">
            <h3>{messages.home.sectionsTitle}</h3>
            <p>{messages.home.sectionsBody}</p>
          </article>
          <article className="card">
            <h3>{messages.home.regionsTitle}</h3>
            <p>{regions.join(" • ")}</p>
          </article>
          <article className="card">
            <h3>{messages.home.quickFactsTitle}</h3>
            <p>
              {formatMessage(messages.home.quickFactsLabel, {
                count: destinations.length
              })}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
