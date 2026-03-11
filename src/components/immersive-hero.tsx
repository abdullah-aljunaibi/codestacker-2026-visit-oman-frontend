"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { immersiveHeroImages } from "@/lib/data/immersive-showcase";
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
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const updateParallax = () => {
      setParallaxOffset(Math.min(window.scrollY * 0.24, 180));
    };

    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });
    return () => window.removeEventListener("scroll", updateParallax);
  }, []);

  return (
    <section className="immersiveHero" aria-label={heroTitle}>
      <div
        className="immersiveHeroMedia"
        style={{ transform: `translate3d(0, ${parallaxOffset}px, 0) scale(1.12)` }}
        aria-hidden="true"
      >
        {immersiveHeroImages.map((image, index) => (
          <span
            key={image.src}
            className="immersiveHeroSlide"
            style={
              {
                backgroundImage: `url('${image.src}')`,
                animationDelay: `${index * 6}s`
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <span className="immersiveHeroGradient" aria-hidden="true" />
      <div className="shell immersiveHeroContent">
        <div id="hero-observer-sentinel" className="heroObserverSentinel" aria-hidden="true" />
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
