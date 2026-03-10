import Link from "next/link";
import { notFound } from "next/navigation";

import { DestinationImage } from "@/components/destination-image";
import { DestinationPreviewHydrated } from "@/components/maps/destination-preview-hydrated.client";
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

function getStatIcon(type: "duration" | "crowd" | "months" | "cost") {
  if (type === "duration") {
    return "D";
  }

  if (type === "crowd") {
    return "C";
  }

  if (type === "months") {
    return "M";
  }

  return "$";
}

function getWhyVisitBody(category: string, locale: "en" | "ar") {
  if (locale === "ar") {
    if (category === "beach") return "ساحل مفتوح يهيئ التوقفات الهادئة والمشاهد الممتدة على الماء.";
    if (category === "culture") return "طبقات من التاريخ المحلي والعمران والعادات في محطة واحدة.";
    if (category === "desert") return "مناظر صحراوية واسعة تمنح الرحلة إيقاعاً مختلفاً وإحساساً بالمكان.";
    if (category === "mountain") return "مرتفعات ومنعطفات بانورامية تستحق أن تكون جزءاً من مسار الرحلة.";
    return "محطة طبيعية تمنحك هواءً أهدأ ومشهداً أكثر اتساعاً وتنوعاً.";
  }

  if (category === "beach") return "Open shoreline, calm pauses, and long sea views make this an easy scenic stop.";
  if (category === "culture") return "Layers of local history, architecture, and living traditions anchor the visit.";
  if (category === "desert") return "Wide desert landscapes bring a different rhythm and stronger sense of place.";
  if (category === "mountain") return "High elevations and panoramic turns make this a strong route-shaping stop.";
  return "A nature-led stop with quieter air, broader views, and more contrast in the journey.";
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

      </div>

      <section className="detailHeroBand">
        <DestinationImage
          destination={destination}
          locale={locale}
          priority
          className="destinationImage detailHeroMedia"
        />
        <div className="shell detailHeroCardShell">
          <article className="card detailFloatingCard">
            <div className="detailFloatingHeader">
              <div className="detailFloatingCopy">
                <span className="kicker">{destination.regionLabel}</span>
                <h1>{destination.name[locale]}</h1>
                <p>{destination.description[locale]}</p>
              </div>
              <div className="ctaRow detailFloatingActions">
                <SaveInterestButton slug={destination.slug} locale={locale} />
                <Link className="pill pillPrimary" href={`/${locale}/planner?focus=${destination.slug}`}>
                  {messages.detail.sendToPlanner}
                </Link>
              </div>
            </div>

            <div className="detailStatPairGrid">
              <article className="detailStatPair">
                <span className="detailStatIcon" aria-hidden="true">
                  {getStatIcon("duration")}
                </span>
                <div>
                  <span>{messages.common.duration}</span>
                  <strong>
                    {destination.recommendedDurationHours}
                    {messages.common.hourUnitShort}
                  </strong>
                </div>
              </article>
              <article className="detailStatPair">
                <span className="detailStatIcon" aria-hidden="true">
                  {getStatIcon("crowd")}
                </span>
                <div>
                  <span>{messages.common.crowdLevel}</span>
                  <strong>{messages.detail.crowdLabel.replace("{value}", String(destination.crowd_level))}</strong>
                </div>
              </article>
              <article className="detailStatPair">
                <span className="detailStatIcon" aria-hidden="true">
                  {getStatIcon("months")}
                </span>
                <div>
                  <span>{messages.common.recommendedMonths}</span>
                  <strong>{destination.recommended_months.map((month) => getMonthLabel(month, locale)).join(" / ")}</strong>
                </div>
              </article>
              <article className="detailStatPair">
                <span className="detailStatIcon" aria-hidden="true">
                  {getStatIcon("cost")}
                </span>
                <div>
                  <span>{messages.detail.costStat}</span>
                  <strong>{formatTicketCost(destination.ticket_cost_omr, locale)}</strong>
                </div>
              </article>
            </div>
          </article>
        </div>
      </section>

      <div className="shell detailContentShell">
        <section className="card sectionCard">
          <div className="sectionHeading detailSectionHeading">
            <div>
              <p className="eyebrow">{messages.detail.practicalTitle}</p>
              <h2>{messages.detail.overviewTitle}</h2>
            </div>
            <p>{messages.detail.whyVisitBody}</p>
          </div>

          <div className="detailWhyGrid">
            {destination.categories.map((category) => (
              <article key={`${destination.slug}-${category}`} className="detailWhyCard">
                <span className="detailWhyIcon" aria-hidden="true">
                  {getStatIcon(category === "mountain" ? "duration" : category === "culture" ? "crowd" : category === "desert" ? "cost" : "months")}
                </span>
                <h3>{getCategoryLabel(category, locale)}</h3>
                <p>{getWhyVisitBody(category, locale)}</p>
              </article>
            ))}
            <article className="detailWhyCard">
              <span className="detailWhyIcon" aria-hidden="true">
                {getStatIcon("months")}
              </span>
              <h3>{messages.detail.regionStat}</h3>
              <p>{destination.regionLabel}</p>
            </article>
          </div>
        </section>

        <section className="card sectionCard detailMapCard">
          <div className="detailMapCopy">
            <div>
              <p className="eyebrow">{messages.detail.mapFrameEyebrow}</p>
              <h2>{messages.detail.mapTitle}</h2>
              <p>{messages.detail.mapBody}</p>
            </div>
            <div className="detailMapLegend" aria-label={messages.detail.mapLegendTitle}>
              <span className="plannerLegendSwatch plannerLegendSwatchPin" aria-hidden="true" />
              <span>{messages.detail.mapLegendPin}</span>
            </div>
          </div>
          <div className="detailMapFrame">
            <div className="detailMapFrameHeader">
              <div className="detailMapFrameStat">
                <span>{messages.common.location}</span>
                <strong>{destination.regionLabel}</strong>
              </div>
              <div className="detailMapFrameStat">
                <span>{messages.common.coordinates}</span>
                <strong>
                  {messages.detail.coordinatesLabel
                    .replace("{lat}", formatDecimal(destination.coordinates.lat, locale, 4))
                    .replace("{lng}", formatDecimal(destination.coordinates.lng, locale, 4))}
                </strong>
              </div>
            </div>
            <div>
              <DestinationPreviewHydrated
                lat={destination.coordinates.lat}
                lng={destination.coordinates.lng}
                title={destination.name[locale]}
              />
            </div>
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
