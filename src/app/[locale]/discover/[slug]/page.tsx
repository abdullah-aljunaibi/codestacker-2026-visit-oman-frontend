import Link from "next/link";
import { notFound } from "next/navigation";

import { SaveInterestButton } from "@/components/save-interest-button";
import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatTicketCost,
  getCategoryLabel,
  getMessages,
  getMonthLabel
} from "@/lib/i18n/messages";

export default async function DestinationPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = resolveLocale(localeParam);
  const messages = getMessages(locale);
  const destinations = normalizeDestinations(loadDestinations(), locale);

  const destination = destinations.find((item) => item.slug === slug);

  if (!destination) {
    notFound();
  }

  const related = destinations.filter(
    (item) => item.regionKey === destination.regionKey && item.slug !== destination.slug
  );

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />
        <p className="backLink">
          <Link href={`/${locale}/discover`}>{messages.common.backToDiscovery}</Link>
        </p>

        <section className="detailGrid">
          <article className="card">
            <h1>{destination.name[locale]}</h1>
            <p>{destination.description[locale]}</p>
            <div className="metaList">
              <span className="meta">{destination.regionLabel}</span>
              <span className="meta">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
              <span className="meta">
                {destination.categories.map((category) => getCategoryLabel(category, locale)).join(" • ")}
              </span>
            </div>
            <div className="ctaRow" style={{ marginTop: "1rem" }}>
              <SaveInterestButton slug={destination.slug} locale={locale} />
              <Link className="pill pillPrimary" href={`/${locale}/planner?focus=${destination.slug}`}>
                {messages.detail.sendToPlanner}
              </Link>
              <Link className="pill" href={`/${locale}/saved`}>
                {messages.common.viewSaved}
              </Link>
            </div>
          </article>

          <aside className="card">
            <h3>{messages.common.recommendedMonths}</h3>
            <p>{destination.idealVisitMonths.map((month) => getMonthLabel(month, locale)).join(" / ")}</p>
            <h3>{messages.common.duration}</h3>
            <p>{destination.recommendedDurationHours}h</p>
          </aside>
        </section>

        <section className="card sectionCard">
          <h3>{messages.common.relatedDestinations}</h3>
          {related.length === 0 ? (
            <p>{messages.detail.noRelated}</p>
          ) : (
            <ul>
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={`/${locale}/discover/${item.slug}`}>{item.name[locale]}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
