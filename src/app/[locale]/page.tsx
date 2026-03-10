import Link from "next/link";

import { loadDestinations } from "@/lib/data/load-destinations";
import { getRegionOptions } from "@/lib/data/selectors";
import { getDiscoveryCopy } from "@/lib/discovery/content";
import { localeDirection, resolveLocale } from "@/lib/i18n/config";

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const copy = getDiscoveryCopy(locale);
  const destinations = loadDestinations();
  const regions = getRegionOptions(destinations, locale).map((option) => option.label);

  return (
    <main dir={localeDirection[locale]} className={locale === "ar" ? "ar" : undefined}>
      <div className="shell">
        <header className="topnav">
          <div className="brand">{copy.siteTitle}</div>
          <nav className="navlinks">
            <Link href={`/${locale}/discover`}>{copy.navDiscover}</Link>
            <Link href={`/${locale}/planner`}>{copy.navPlanner}</Link>
          </nav>
        </header>

        <section className="hero">
          <span className="kicker">{copy.heroKicker}</span>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroBody}</p>
          <div className="ctaRow">
            <Link className="pill pillPrimary" href={`/${locale}/discover`}>
              {copy.ctaPrimary}
            </Link>
            <Link className="pill" href={`/${locale}/planner`}>
              {copy.ctaSecondary}
            </Link>
          </div>
        </section>

        <section className="grid3" style={{ marginTop: "1rem" }}>
          <article className="card">
            <h3>{copy.sectionsTitle}</h3>
            <p>{locale === "ar" ? "ثقافة، مغامرات، عائلات، ورحلات طبيعية." : "Culture, adventure, family, and nature-led routes."}</p>
          </article>
          <article className="card">
            <h3>{copy.regionsTitle}</h3>
            <p>{regions.join(" • ")}</p>
          </article>
          <article className="card">
            <h3>{copy.quickFactsTitle}</h3>
            <p>
              {locale === "ar"
                ? `${destinations.length} وجهة في مجموعة البيانات الحالية.`
                : `${destinations.length} destinations in the current dataset.`}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
