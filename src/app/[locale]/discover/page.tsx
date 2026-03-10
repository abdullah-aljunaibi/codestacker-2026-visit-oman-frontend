import Link from "next/link";

import { SaveInterestButton } from "@/components/save-interest-button";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { getCategoryOptions, getRegionOptions } from "@/lib/data/selectors";
import { getDiscoveryCopy } from "@/lib/discovery/content";
import { applyDiscoveryQuery, parseDiscoveryFilters } from "@/lib/discovery/query";
import { localeDirection, resolveLocale } from "@/lib/i18n/config";

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
  const copy = getDiscoveryCopy(locale);
  const filters = parseDiscoveryFilters(resolvedSearchParams);
  const destinations = loadDestinations();
  const normalizedDestinations = normalizeDestinations(destinations, locale);
  const normalizedBySlug = new Map(normalizedDestinations.map((destination) => [destination.slug, destination]));

  const regions = getRegionOptions(destinations, locale);
  const categories = getCategoryOptions(destinations);
  const results = applyDiscoveryQuery([...destinations], filters).map(
    (destination) => normalizedBySlug.get(destination.slug)!
  );

  return (
    <main dir={localeDirection[locale]} className={locale === "ar" ? "ar" : undefined}>
      <div className="shell">
        <header className="topnav">
          <div className="brand">{copy.discoverTitle}</div>
          <nav className="navlinks">
            <Link href={`/${locale}`}>{copy.siteTitle}</Link>
            <Link href={`/${locale}/saved`}>{locale === "ar" ? "المحفوظات" : "Saved"}</Link>
            <Link href={`/${locale}/planner`}>{copy.navPlanner}</Link>
          </nav>
        </header>

        <p>{copy.discoverBody}</p>

        <section className="card" style={{ marginBottom: "1rem" }}>
          <h3>{locale === "ar" ? "الانتقال إلى التخطيط" : "Move from discovery to planning"}</h3>
          <p>
            {locale === "ar"
              ? "احفظ وجهاتك المفضلة أثناء التصفح، ثم افتح صفحة المخطط لتعبئة التفضيلات قبل التوليد."
              : "Save destinations while browsing, then open planner to submit trip preferences before itinerary generation."}
          </p>
          <div className="ctaRow">
            <Link className="pill" href={`/${locale}/saved`}>
              {locale === "ar" ? "عرض الاهتمامات المحفوظة" : "View saved interests"}
            </Link>
            <Link className="pill pillPrimary" href={`/${locale}/planner`}>
              {locale === "ar" ? "فتح إدخال المخطط" : "Open planner input"}
            </Link>
          </div>
        </section>

        <form method="get" className="filterBar" style={{ marginTop: "1rem" }}>
          <div>
            <label htmlFor="region">{copy.filterRegion}</label>
            <select id="region" name="region" defaultValue={filters.region ?? ""}>
              <option value="">{copy.allRegions}</option>
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="category">{copy.filterTag}</label>
            <select id="category" name="category" defaultValue={filters.category ?? ""}>
              <option value="">{copy.allTags}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort">{copy.sortLabel}</label>
            <select id="sort" name="sort" defaultValue={filters.sort ?? "crowd_asc"}>
              <option value="crowd_asc">{locale === "ar" ? "الأقل ازدحاماً" : "Crowd (Low to High)"}</option>
              <option value="cost_asc">{locale === "ar" ? "التكلفة (الأقل أولاً)" : "Cost (Low to High)"}</option>
              <option value="duration_asc">
                {locale === "ar" ? "المدة (الأقصر أولاً)" : "Duration (Short to Long)"}
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="submit">{copy.filtersTitle}</label>
            <button id="submit" type="submit">
              {copy.filtersTitle}
            </button>
          </div>
        </form>

        <p className="listHeader">
          {results.length} {copy.cardsLabel}
        </p>

        {results.length === 0 ? (
          <article className="card">
            <p>{copy.emptyState}</p>
          </article>
        ) : (
          <section className="grid3">
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
                  <span className="meta">{destination.budgetLevel}</span>
                  <span className="meta">{destination.recommendedDurationHours}h</span>
                </div>
                <div className="ctaRow" style={{ marginTop: "0.85rem" }}>
                  <SaveInterestButton slug={destination.slug} locale={locale} />
                  <Link className="pill" href={`/${locale}/planner?focus=${destination.slug}`}>
                    {locale === "ar" ? "خطط بهذه الوجهة" : "Plan with this"}
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
