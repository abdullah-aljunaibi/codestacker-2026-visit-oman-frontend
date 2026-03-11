"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
        <iframe
          src="https://www.youtube.com/embed/Ki_Cjln0dFg?autoplay=1&mute=1&loop=1&playlist=Ki_Cjln0dFg&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1"
          title="Visit Oman"
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="immersiveHeroVideo"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "120vw",
            height: "120vh",
            minWidth: "120vw",
            minHeight: "120vh",
            transform: "translate(-50%, -50%)",
            border: "none",
            objectFit: "cover",
            pointerEvents: "none"
          }}
        />
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
