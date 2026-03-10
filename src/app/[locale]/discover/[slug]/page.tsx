import Link from "next/link";
import { notFound } from "next/navigation";

import { DestinationImage } from "@/components/destination-image";
import { DestinationPreviewHydrated } from "@/components/maps/destination-preview-hydrated.client";
import { StaticDestinationPreview } from "@/components/maps/static-destination-preview";
import { SaveInterestButton } from "@/components/save-interest-button";
import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { getFeaturedDestinations } from "@/lib/data/selectors";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatDecimal,
  formatTicketCost,
  getCategoryLabel,
  getMessages,
  getMonthLabel
} from "@/lib/i18n/messages";

export function generateStaticParams() {
  return loadDestinations().map((destination) => ({
    slug: destination.slug
  }));
}

function crowdDots(level: number) {
  return Array.from({ length: 5 }, (_, index) => index < level);
}

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
  const featuredElsewhere = getFeaturedDestinations(loadDestinations(), 3)
    .map((item) => destinations.find((destinationItem) => destinationItem.slug === item.slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.slug !== destination.slug);

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />
        <p className="backLink">
          <Link href={`/${locale}/discover`}>{messages.common.backToDiscovery}</Link>
        </p>

        <section className="hero detailHero">
          <div className="heroPanel">
            <DestinationImage
              destination={destination}
              locale={locale}
              priority
              className="destinationImage destinationImageHero"
            />
            <span className="kicker">{destination.regionLabel}</span>
            <h1>{destination.name[locale]}</h1>
            <p>{destination.description[locale]}</p>
            <div className="metaList">
              <span className="meta">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
              <span className="meta">
                {messages.common.duration}: {destination.recommendedDurationHours}
                {messages.common.hourUnitShort}
              </span>
              <span className="meta">{messages.detail.crowdLabel.replace("{value}", String(destination.crowd_level))}</span>
            </div>
            <div className="ctaRow">
              <SaveInterestButton slug={destination.slug} locale={locale} />
              <Link className="pill pillPrimary" href={`/${locale}/planner?focus=${destination.slug}`}>
                {messages.detail.sendToPlanner}
              </Link>
            </div>
          </div>

          <aside className="card detailAside">
            <h2>{messages.detail.practicalTitle}</h2>

            <div className="detailStat">
              <span>{messages.common.recommendedMonths}</span>
              <strong>{destination.recommended_months.map((month) => getMonthLabel(month, locale)).join(" / ")}</strong>
            </div>

            <div className="detailStat">
              <span>{messages.common.location}</span>
              <strong>{destination.regionLabel}</strong>
            </div>

            <div className="detailStat">
              <span>{messages.common.coordinates}</span>
              <strong>
                {messages.detail.coordinatesLabel
                  .replace("{lat}", formatDecimal(destination.coordinates.lat, locale, 4))
                  .replace("{lng}", formatDecimal(destination.coordinates.lng, locale, 4))}
              </strong>
            </div>
          </aside>
        </section>

        <section className="detailGrid detailBodyGrid">
          <article className="card">
            <h2>{messages.detail.overviewTitle}</h2>
            <p>{destination.description[locale]}</p>

            <div className="tagRow">
              {destination.categories.map((category) => (
                <span key={`${destination.slug}-${category}`} className="meta">
                  {getCategoryLabel(category, locale)}
                </span>
              ))}
            </div>
          </article>

          <article className="card">
            <h2>{messages.common.crowdLevel}</h2>
            <div className="crowdScale" aria-hidden="true">
              {crowdDots(destination.crowd_level).map((active, index) => (
                <span key={`${destination.slug}-scale-${index + 1}`} className={active ? "crowdDot crowdDotActive" : "crowdDot"} />
              ))}
            </div>
            <div className="crowdLabels">
              <span>{messages.detail.lowCrowd}</span>
              <span>{messages.detail.highCrowd}</span>
            </div>
            <p>{messages.detail.crowdLabel.replace("{value}", String(destination.crowd_level))}</p>

            <h3>{messages.common.duration}</h3>
            <p>{messages.detail.visitDurationLabel.replace("{value}", String(destination.recommendedDurationHours))}</p>
          </article>
        </section>

        <section className="card sectionCard detailMapCard">
          <div className="detailMapCopy">
            <div>
              <h2>{messages.detail.mapTitle}</h2>
              <p>{messages.detail.mapBody}</p>
            </div>
            <div className="detailMapLegend" aria-label={messages.detail.mapLegendTitle}>
              <span className="plannerLegendSwatch plannerLegendSwatchPin" aria-hidden="true" />
              <span>{messages.detail.mapLegendPin}</span>
            </div>
          </div>
          <div className="detailMapStack">
            <StaticDestinationPreview
              lat={destination.coordinates.lat}
              lng={destination.coordinates.lng}
              title={destination.name[locale]}
              subtitle={messages.detail.mapPreviewAlt.replace("{name}", destination.name[locale])}
            />
            <DestinationPreviewHydrated
              lat={destination.coordinates.lat}
              lng={destination.coordinates.lng}
              title={destination.name[locale]}
            />
          </div>
        </section>

        <section className="card sectionCard">
          <h2>{messages.common.relatedDestinations}</h2>
          {related.length === 0 ? (
            <p>{messages.detail.noRelated}</p>
          ) : (
            <div className="relatedGrid">
              {related.map((item) => (
                <Link key={item.id} href={`/${locale}/discover/${item.slug}`} className="relatedLink">
                  <strong>{item.name[locale]}</strong>
                  <span>{item.description[locale]}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {featuredElsewhere.length > 0 ? (
          <section className="card sectionCard">
            <h2>{messages.home.featuredTitle}</h2>
            <div className="relatedGrid">
              {featuredElsewhere.map((item) => (
                <Link key={item.slug} href={`/${locale}/discover/${item.slug}`} className="relatedLink">
                  <strong>{item.name[locale]}</strong>
                  <span>{item.regionLabel}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
