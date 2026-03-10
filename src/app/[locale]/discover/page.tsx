import Link from "next/link";

import { DestinationImage } from "@/components/destination-image";
import { SaveInterestButton } from "@/components/save-interest-button";
import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import {
  getCategoryOptions,
  getRegionHighlights,
  getRegionOptions,
  getSeasonOptions
} from "@/lib/data/selectors";
import { applyDiscoveryQuery, parseDiscoveryFilters } from "@/lib/discovery/query";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatMessage,
  formatTicketCost,
  getMessages,
  getMonthLabel,
  getSortLabel
} from "@/lib/i18n/messages";

function crowdDots(level: number) {
  return Array.from({ length: 5 }, (_, index) => index < level);
}

export default async function DiscoverPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const messages = getMessages(locale);
  const filters = parseDiscoveryFilters(resolvedSearchParams);
  const destinations = loadDestinations();
  const normalizedDestinations = normalizeDestinations(destinations, locale);
  const normalizedBySlug = new Map(normalizedDestinations.map((destination) => [destination.slug, destination]));
  const results = applyDiscoveryQuery([...destinations], filters).map(
    (destination) => normalizedBySlug.get(destination.slug)!
  );

  const regions = getRegionOptions(destinations, locale);
  const categories = getCategoryOptions(destinations, locale);
  const seasons = getSeasonOptions(locale);
  const regionHighlights = getRegionHighlights(destinations, locale, 3);
  const activeFilters = [
    filters.region ? regions.find((region) => region.value === filters.region)?.label : null,
    filters.category ? categories.find((category) => category.value === filters.category)?.label : null,
    filters.season ? getMonthLabel(filters.season, locale) : null,
    filters.sort ? getSortLabel(filters.sort, locale) : null
  ].filter(Boolean) as string[];

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} title={messages.discover.title} />

        <section className="hero catalogueHero">
          <div className="heroPanel">
            <span className="kicker">{messages.discover.title}</span>
            <h1>{messages.discover.title}</h1>
            <p>{messages.discover.body}</p>
          </div>
          <div className="heroMiniGrid">
            {regionHighlights.map((region) => (
              <article key={region.value} className="card cardSubtle">
                <p className="eyebrow">{region.label}</p>
                <strong>{region.count}</strong>
                <p>{region.sample?.name[locale] ?? messages.common.notSpecified}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card sectionCard discoveryToolbar">
          <div>
            <h2>{messages.discover.filterTitle}</h2>
            <p>{messages.discover.plannerBridgeBody}</p>
          </div>
          <div className="ctaRow">
            <Link className="pill" href={`/${locale}/saved`}>
              {messages.common.viewSaved}
            </Link>
            <Link className="pill pillPrimary" href={`/${locale}/planner`}>
              {messages.common.openPlanner}
            </Link>
          </div>
        </section>

        <form method="get" className="filterBar filterPanel">
          <div>
            <label htmlFor="region">{messages.common.region}</label>
            <select id="region" name="region" defaultValue={filters.region ?? ""}>
              <option value="">{messages.discover.allRegions}</option>
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="category">{messages.common.category}</label>
            <select id="category" name="category" defaultValue={filters.category ?? ""}>
              <option value="">{messages.discover.allCategories}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="season">{messages.common.season}</label>
            <select id="season" name="season" defaultValue={filters.season ? String(filters.season) : ""}>
              <option value="">{messages.discover.allSeasons}</option>
              {seasons.map((season) => (
                <option key={season.value} value={season.value}>
                  {season.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort">{messages.discover.sortLabel}</label>
            <select id="sort" name="sort" defaultValue={filters.sort ?? "crowd_asc"}>
              <option value="crowd_asc">{getSortLabel("crowd_asc", locale)}</option>
              <option value="cost_asc">{getSortLabel("cost_asc", locale)}</option>
              <option value="duration_asc">{getSortLabel("duration_asc", locale)}</option>
            </select>
          </div>

          <div className="filterAction filterActionWide">
            <button type="submit">{messages.common.applyFilters}</button>
            <Link className="pill" href={`/${locale}/discover`}>
              {messages.common.clearFilters}
            </Link>
          </div>
        </form>

        <section className="catalogueSummary">
          <div>
            <p className="listHeader">
              {formatMessage(messages.discover.resultsLabel, {
                count: results.length
              })}
            </p>
            {activeFilters.length > 0 ? (
              <div className="metaList">
                {activeFilters.map((label) => (
                  <span key={label} className="meta">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {results.length === 0 ? (
          <article className="card emptyStateCard">
            <h2>{messages.discover.emptyTitle}</h2>
            <p>{messages.discover.emptyState}</p>
            <div className="ctaRow">
              <Link className="pill pillPrimary" href={`/${locale}/discover`}>
                {messages.common.clearFilters}
              </Link>
              <Link className="pill" href={`/${locale}/planner`}>
                {messages.common.openPlanner}
              </Link>
            </div>
          </article>
        ) : (
          <section className="destinationGrid">
            {results.map((destination) => (
              <article key={destination.id} className="card destinationCard">
                <DestinationImage destination={destination} locale={locale} />
                <div className="destinationCardTop">
                  <p className="eyebrow">{destination.regionLabel}</p>
                  <div className="crowdMeter" aria-label={`${messages.common.crowdLevel} ${destination.crowd_level}/5`}>
                    {crowdDots(destination.crowd_level).map((active, index) => (
                      <span
                        key={`${destination.slug}-crowd-${index + 1}`}
                        className={active ? "crowdDot crowdDotActive" : "crowdDot"}
                      />
                    ))}
                  </div>
                </div>

                <h2>
                  <Link href={`/${locale}/discover/${destination.slug}`}>{destination.name[locale]}</Link>
                </h2>
                <p>{destination.description[locale]}</p>

                <div className="metaList">
                  <span className="meta">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
                  <span className="meta">
                    {destination.recommendedDurationHours}
                    {messages.common.hourUnitShort}
                  </span>
                  <span className="meta">{getMonthLabel(destination.recommended_months[0] ?? 1, locale)}</span>
                </div>

                <div className="tagRow">
                  {destination.categories.map((category) => (
                    <Link
                      key={`${destination.slug}-${category}`}
                      href={`/${locale}/discover?category=${category}`}
                      className="meta tagLink"
                    >
                      {categories.find((option) => option.value === category)?.label ?? category}
                    </Link>
                  ))}
                </div>

                <div className="ctaRow destinationActions">
                  <SaveInterestButton slug={destination.slug} locale={locale} />
                  <Link className="pill pillPrimary" href={`/${locale}/discover/${destination.slug}`}>
                    {messages.home.ctaPrimary}
                  </Link>
                  <Link className="pill" href={`/${locale}/planner?focus=${destination.slug}`}>
                    {messages.discover.planWithThis}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
