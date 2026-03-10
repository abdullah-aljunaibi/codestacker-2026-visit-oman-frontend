import Link from "next/link";

import type { Locale } from "@/types/dataset";

export function ImmersiveHero({
  locale,
  destinationCount,
  regionCount
}: {
  locale: Locale;
  destinationCount: number;
  regionCount: number;
}) {
  const heroTitle = locale === "ar" ? "اكتشف جمال عُمان" : "Discover the Beauty of Oman";
  const heroSubtitle =
    locale === "ar"
      ? "جبال مهيبة، صحارى هادئة، وسواحل تستحق أن تُبنى الرحلة حولها."
      : "Mountain horizons, desert quiet, and coastlines worth planning around.";
  const plannerLabel =
    locale === "ar" ? "مخطط رحلات حتمي حتى 7 أيام" : "Deterministic 7-day planner";
  const destinationLabel = locale === "ar" ? "وجهة مختارة" : "Curated destinations";
  const regionLabel = locale === "ar" ? "مناطق للاستكشاف" : "Regions to explore";
  const scrollLabel = locale === "ar" ? "اكتشف المزيد" : "Scroll to explore";

  return (
    <section
      className="immersiveHero"
      aria-label={heroTitle}
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(10, 77, 92, 0.12) 0%, rgba(26, 26, 46, 0.84) 100%), url('https://images.unsplash.com/photo-1626095460016-8664dc341f69?auto=format&fit=crop&w=2000&q=80')"
      }}
    >
      <div className="shell immersiveHeroContent">
        <div className="immersiveHeroCopy">
          <span className="immersiveHeroKicker">
            {locale === "ar" ? "رحلات عُمان" : "Visit Oman"}
          </span>
          <h1>{heroTitle}</h1>
          <p className="immersiveHeroSubtitle">{heroSubtitle}</p>
          <div className="ctaRow">
            <Link className="pill pillPrimary immersiveHeroPrimary" href={`/${locale}/planner`}>
              {locale === "ar" ? "ابدأ التخطيط" : "Start planning"}
            </Link>
            <Link className="pill immersiveHeroGhost" href={`/${locale}/discover`}>
              {locale === "ar" ? "استكشف الوجهات" : "Explore destinations"}
            </Link>
          </div>
        </div>

        <div className="immersiveHeroFooter">
          <div className="immersiveHeroStatsBar">
            <span>
              <strong>{destinationCount}</strong>
              {destinationLabel}
            </span>
            <span>
              <strong>{regionCount}</strong>
              {regionLabel}
            </span>
            <span>{plannerLabel}</span>
          </div>
          <a className="scrollIndicator" href="#category-exploration" aria-label={scrollLabel}>
            <span className="scrollIndicatorText">{scrollLabel}</span>
            <span className="scrollIndicatorChevron" aria-hidden="true">
              <span />
              <span />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
