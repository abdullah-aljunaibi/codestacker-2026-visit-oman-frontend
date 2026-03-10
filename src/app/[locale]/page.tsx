import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import {
  getCategorySpotlights,
  getFeaturedDestinations,
  getRegionHighlights,
  getRegionOptions
} from "@/lib/data/selectors";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatMessage,
  formatTicketCost,
  getMessages,
  getMonthLabel
} from "@/lib/i18n/messages";

function getSeasonCopy(months: number[], locale: "en" | "ar") {
  return months.slice(0, 3).map((month) => getMonthLabel(month, locale)).join(" • ");
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const messages = getMessages(locale);
  const destinations = loadDestinations();
  const normalizedDestinations = normalizeDestinations(destinations, locale);
  const normalizedBySlug = new Map(
    normalizedDestinations.map((destination) => [destination.slug, destination])
  );
  const regions = getRegionOptions(destinations, locale);
  const featuredDestinations = getFeaturedDestinations(destinations).map((destination) => ({
    ...normalizedBySlug.get(destination.slug)!,
    ...destination
  }));
  const categorySpotlights = getCategorySpotlights(destinations, locale);
  const regionHighlights = getRegionHighlights(destinations, locale);

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />

        <section className="hero heroDiscovery">
          <div className="heroPanel">
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
          </div>

          <div className="heroShowcase card">
            <div className="heroStatsGrid">
              <article className="heroStat">
                <strong>{destinations.length}</strong>
                <span>
                  {formatMessage(messages.home.heroStatsDestinations, {
                    count: destinations.length
                  })}
                </span>
              </article>
              <article className="heroStat">
                <strong>{regions.length}</strong>
                <span>
                  {formatMessage(messages.home.heroStatsRegions, {
                    count: regions.length
                  })}
                </span>
              </article>
              <article className="heroStat">
                <strong>{categorySpotlights.length}</strong>
                <span>
                  {formatMessage(messages.home.heroStatsCategories, {
                    count: categorySpotlights.length
                  })}
                </span>
              </article>
            </div>

            <div className="heroFeatureList">
              {featuredDestinations.slice(0, 3).map((destination) => (
                <article key={destination.slug} className="heroFeatureItem">
                  <div>
                    <p className="eyebrow">{destination.regionLabel}</p>
                    <h3>{destination.name[locale]}</h3>
                  </div>
                  <p>{destination.description[locale]}</p>
                  <div className="metaList">
                    <span className="meta">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
                    <span className="meta">{getSeasonCopy(destination.recommended_months, locale)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sectionBlock">
          <div className="sectionHeading">
            <div>
              <span className="kicker">{messages.home.sectionsTitle}</span>
              <h2>{messages.home.sectionsTitle}</h2>
            </div>
            <p>{messages.home.sectionsBody}</p>
          </div>

          <div className="infoGrid spotlightGrid">
            {categorySpotlights.map((category) => (
              <article key={category.value} className="card spotlightCard">
                <div className="spotlightHeader">
                  <div>
                    <h3>{category.label}</h3>
                    <p>{formatMessage(messages.home.quickFactsLabel, { count: category.count })}</p>
                  </div>
                  <span className="meta">{category.count}</span>
                </div>
                <div className="spotlightLinks">
                  {category.featured.map((destination) => (
                    <Link
                      key={destination.slug}
                      href={`/${locale}/discover/${destination.slug}`}
                      className="spotlightLink"
                    >
                      <strong>{destination.name[locale]}</strong>
                      <span>{normalizedBySlug.get(destination.slug)?.regionLabel ?? destination.region.ar}</span>
                    </Link>
                  ))}
                </div>
                <Link className="pill" href={`/${locale}/discover?category=${category.value}`}>
                  {messages.home.categoryCta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionBlock">
          <div className="sectionHeading">
            <div>
              <span className="kicker">{messages.home.featuredTitle}</span>
              <h2>{messages.home.featuredTitle}</h2>
            </div>
            <p>{messages.home.featuredBody}</p>
          </div>

          <div className="featureDeck">
            {featuredDestinations.map((destination) => (
              <article key={destination.slug} className="card destinationCard destinationCardWide">
                <p className="eyebrow">{destination.regionLabel}</p>
                <h3>
                  <Link href={`/${locale}/discover/${destination.slug}`}>{destination.name[locale]}</Link>
                </h3>
                <p>{destination.description[locale]}</p>
                <div className="metaList">
                  <span className="meta">{messages.common.crowdLevel}: {destination.crowd_level}/5</span>
                  <span className="meta">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
                  <span className="meta">
                    {getMonthLabel(destination.recommended_months[0] ?? 1, locale)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionBlock">
          <div className="sectionHeading">
            <div>
              <span className="kicker">{messages.home.regionsTitle}</span>
              <h2>{messages.home.regionsTitle}</h2>
            </div>
            <p>{messages.home.regionsBody}</p>
          </div>

          <div className="infoGrid">
            {regionHighlights.map((region) => (
              <article key={region.value} className="card regionCard">
                <div className="spotlightHeader">
                  <div>
                    <h3>{region.label}</h3>
                    <p>{formatMessage(messages.home.quickFactsLabel, { count: region.count })}</p>
                  </div>
                  <span className="meta">{region.count}</span>
                </div>
                {region.sample ? (
                  <>
                    <p>{normalizedBySlug.get(region.sample.slug)?.description[locale] ?? region.sample.name[locale]}</p>
                    <Link className="textLink" href={`/${locale}/discover/${region.sample.slug}`}>
                      {region.sample.name[locale]}
                    </Link>
                  </>
                ) : null}
                <Link className="pill" href={`/${locale}/discover?region=${encodeURIComponent(region.value)}`}>
                  {messages.home.regionCta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="card plannerBanner">
          <div>
            <span className="kicker">{messages.home.plannerTitle}</span>
            <h2>{messages.home.plannerTitle}</h2>
            <p>{messages.home.plannerBody}</p>
          </div>
          <div className="ctaRow">
            <Link className="pill pillPrimary" href={`/${locale}/planner`}>
              {messages.home.plannerPrimary}
            </Link>
            <Link className="pill" href={`/${locale}/saved`}>
              {messages.home.plannerSecondary}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
