import Link from "next/link";

import { SaveInterestButton } from "@/components/save-interest-button";
import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { getCategoryOptions, getRegionOptions } from "@/lib/data/selectors";
import { applyDiscoveryQuery, parseDiscoveryFilters } from "@/lib/discovery/query";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatMessage,
  formatTicketCost,
  getMessages,
  getSortLabel
} from "@/lib/i18n/messages";

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

  const regions = getRegionOptions(destinations, locale);
  const categories = getCategoryOptions(destinations, locale);
  const results = applyDiscoveryQuery([...destinations], filters).map(
    (destination) => normalizedBySlug.get(destination.slug)!
  );

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} title={messages.discover.title} />

        <p className="pageIntro">{messages.discover.body}</p>

        <section className="card sectionCard">
          <h3>{messages.discover.plannerBridgeTitle}</h3>
          <p>{messages.discover.plannerBridgeBody}</p>
          <div className="ctaRow">
            <Link className="pill" href={`/${locale}/saved`}>
              {messages.common.viewSaved}
            </Link>
            <Link className="pill pillPrimary" href={`/${locale}/planner`}>
              {messages.common.openPlanner}
            </Link>
          </div>
        </section>

        <form method="get" className="filterBar">
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
            <label htmlFor="sort">{messages.discover.filterTitle}</label>
            <select id="sort" name="sort" defaultValue={filters.sort ?? "crowd_asc"}>
              <option value="crowd_asc">{getSortLabel("crowd_asc", locale)}</option>
              <option value="cost_asc">{getSortLabel("cost_asc", locale)}</option>
              <option value="duration_asc">{getSortLabel("duration_asc", locale)}</option>
            </select>
          </div>

          <div className="filterAction">
            <label htmlFor="submit">{messages.discover.filterTitle}</label>
            <button id="submit" type="submit">
              {messages.common.applyFilters}
            </button>
          </div>
        </form>

        <p className="listHeader">
          {formatMessage(messages.discover.resultsLabel, {
            count: results.length
          })}
        </p>

        {results.length === 0 ? (
          <article className="card">
            <p>{messages.discover.emptyState}</p>
          </article>
        ) : (
          <section className="infoGrid">
            {results.map((destination) => (
              <article key={destination.id} className="card">
                <h3>
                  <Link href={`/${locale}/discover/${destination.slug}`}>
                    {destination.name[locale]}
                  </Link>
                </h3>
                <p>{destination.description[locale]}</p>
                <div className="metaList">
                  <span className="meta">{destination.regionLabel}</span>
                  <span className="meta">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
                  <span className="meta">{destination.recommendedDurationHours}h</span>
                </div>
                <div className="ctaRow" style={{ marginTop: "0.85rem" }}>
                  <SaveInterestButton slug={destination.slug} locale={locale} />
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
