import Link from "next/link";
import { notFound } from "next/navigation";

import { SaveInterestButton } from "@/components/save-interest-button";
import { loadDestinations } from "@/lib/data/load-destinations";
import { getLocalizedRegionLabel, getRegionKey, minutesToHours } from "@/lib/data/normalize-destinations";
import { findDestinationBySlug } from "@/lib/data/selectors";
import { getDiscoveryCopy } from "@/lib/discovery/content";
import { localeDirection, resolveLocale } from "@/lib/i18n/config";

export default async function DestinationPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = resolveLocale(localeParam);
  const copy = getDiscoveryCopy(locale);
  const destinations = loadDestinations();

  const destination = findDestinationBySlug(destinations, slug);

  if (!destination) {
    notFound();
  }

  const related = destinations.filter(
    (item) => getRegionKey(item) === getRegionKey(destination) && item.slug !== destination.slug
  );

  return (
    <main dir={localeDirection[locale]} className={locale === "ar" ? "ar" : undefined}>
      <div className="shell">
        <p>
          <Link href={`/${locale}/discover`}>{copy.detailBack}</Link>
        </p>

        <section className="split">
          <article className="card">
            <h1>{destination.name[locale]}</h1>
            <p>{destination.description[locale]}</p>
            <div className="metaList">
              <span className="meta">{getLocalizedRegionLabel(destination, locale)}</span>
              <span className="meta">{destination.ticket_cost_omr} OMR</span>
              <span className="meta">{destination.categories.join(" • ")}</span>
            </div>
            <div className="ctaRow" style={{ marginTop: "1rem" }}>
              <SaveInterestButton slug={destination.slug} locale={locale} />
              <Link className="pill pillPrimary" href={`/${locale}/planner?focus=${destination.slug}`}>
                {locale === "ar" ? "أضف إلى إدخال المخطط" : "Send to planner input"}
              </Link>
              <Link className="pill" href={`/${locale}/saved`}>
                {locale === "ar" ? "عرض المحفوظات" : "View saved"}
              </Link>
            </div>
          </article>

          <aside className="card">
            <h3>{copy.detailBestMonths}</h3>
            <p>{destination.recommended_months.join(" / ")}</p>
            <h3>{copy.detailDuration}</h3>
            <p>{minutesToHours(destination.avg_visit_duration_minutes)}h</p>
          </aside>
        </section>

        <section className="card" style={{ marginTop: "1rem" }}>
          <h3>{copy.detailRelated}</h3>
          {related.length === 0 ? (
            <p>{locale === "ar" ? "لا توجد وجهات مرتبطة بعد." : "No related destinations yet."}</p>
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
