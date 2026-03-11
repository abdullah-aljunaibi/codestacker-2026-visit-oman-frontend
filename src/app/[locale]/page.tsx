import Link from "next/link";

import { CategoryShowcase } from "@/components/category-showcase";
import { CategoryExplorationCard } from "@/components/category-exploration-card";
import { DestinationCard } from "@/components/destination-card";
import { DestinationImage } from "@/components/destination-image";
import { ImmersiveHero } from "@/components/immersive-hero";
import { RevealSection } from "@/components/reveal-section";
import { SiteHeader } from "@/components/site-header";
import { getImmersiveCategoryCards } from "@/lib/data/immersive-showcase";
import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import {
  getFeaturedDestinations,
  getRegionHighlights,
  getRegionOptions
} from "@/lib/data/selectors";
import { resolveLocale } from "@/lib/i18n/config";
import { formatMessage, getMessages } from "@/lib/i18n/messages";

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
  const featuredDestinations = getFeaturedDestinations(destinations, 6).map((destination) => ({
    ...normalizedBySlug.get(destination.slug)!,
    ...destination
  }));
  const categoryCards = getImmersiveCategoryCards(destinations, locale);
  const regionHighlights = getRegionHighlights(destinations, locale);
  const showcaseItems = [
    {
      slug: "nizwa-fort",
      category: locale === "ar" ? "ثقافة" : "Culture",
      label: normalizedBySlug.get("nizwa-fort")!.name[locale],
      description:
        locale === "ar"
          ? "حصون وأسواق وحكايات عمرانية تمنحك قراءة واضحة لذاكرة عُمان الحية."
          : "Forts, souqs, and living architecture frame a category rooted in Oman's cultural memory.",
      href: `/${locale}/discover?category=culture`
    },
    {
      slug: "wadi-bani-khalid",
      category: locale === "ar" ? "طبيعة" : "Nature",
      label: normalizedBySlug.get("wadi-bani-khalid")!.name[locale],
      description:
        locale === "ar"
          ? "أودية ومياه صافية وتوقفات هوائية أهدأ تشكل النسخة الأكثر انتعاشاً من الرحلة."
          : "Clear pools, canyon walls, and slower air define the most restorative side of the journey.",
      href: `/${locale}/discover?category=nature`
    },
    {
      slug: "jebel-akhdar",
      category: locale === "ar" ? "جبال" : "Mountain",
      label: normalizedBySlug.get("jebel-akhdar")!.name[locale],
      description:
        locale === "ar"
          ? "قرى معلقة ومرتفعات مزروعة وطرق بانورامية تعطي الجبال حضورها الكامل."
          : "Terraced villages, high-altitude farms, and long views give the mountain category its edge.",
      href: `/${locale}/discover?category=mountain`
    },
    {
      slug: "wahiba-sands",
      category: locale === "ar" ? "صحراء" : "Desert",
      label: normalizedBySlug.get("wahiba-sands")!.name[locale],
      description:
        locale === "ar"
          ? "تموجات رملية ومعسكرات مفتوحة وضوء متغير يجعل الصحراء تجربة إيقاع ومشهد معاً."
          : "Rolling dunes, open camps, and shifting light turn the desert into a category of rhythm and scale.",
      href: `/${locale}/discover?category=desert`
    },
    {
      slug: "mughsail-beach",
      category: locale === "ar" ? "شاطئ" : "Beach",
      label: normalizedBySlug.get("mughsail-beach")!.name[locale],
      description:
        locale === "ar"
          ? "سواحل ممتدة ومياه مفتوحة وخط أفق نظيف يضع البحر في الواجهة."
          : "Long shorelines, open water, and clean horizons put the coast front and center.",
      href: `/${locale}/discover?category=beach`
    },
    {
      slug: "jebel-shams",
      category: locale === "ar" ? "مغامرة" : "Adventure",
      label: normalizedBySlug.get("jebel-shams")!.name[locale],
      description:
        locale === "ar"
          ? "حواف مرتفعة ومسارات أطول ومشهد واسع يرفع كثافة اليوم ويكافئ التقدم للأعلى."
          : "Higher ridgelines, longer routes, and dramatic elevation make this the category with the most momentum.",
      href: `/${locale}/discover?category=mountain`
    }
  ].map((item) => ({
    id: item.slug,
    title: item.category,
    description: item.description,
    href: item.href,
    image: normalizedBySlug.get(item.slug)!.heroImage.src,
    label: item.label
  }));

  return (
    <main className="page pageHome">
      <div className="heroFrame">
        <div className="shell heroHeaderShell">
          <SiteHeader locale={locale} overlay />
        </div>
        <ImmersiveHero locale={locale} destinationCount={destinations.length} regionCount={regions.length} />
      </div>

      <div className="shell">
        <RevealSection className="sectionBlock">
          <div id="category-exploration" className="sectionAnchor" />
          <div className="sectionHeading">
            <div>
              <span className="kicker">{messages.home.sectionsTitle}</span>
              <h2>{messages.home.sectionsTitle}</h2>
            </div>
            <p>{messages.home.sectionsBody}</p>
          </div>

          <div className="categoryExplorationGrid">
            {categoryCards.map((category) => (
              <CategoryExplorationCard
                key={category.id}
                locale={locale}
                title={category.title}
                href={category.href}
                count={category.count}
                image={category.image}
              />
            ))}
          </div>
        </RevealSection>
      </div>

      <CategoryShowcase
        items={showcaseItems}
        ariaLabel={locale === "ar" ? "عرض الفئات" : "Category showcase"}
        ctaLabel={locale === "ar" ? "استكشف" : "Explore"}
      />

      <div className="shell">
        <RevealSection className="sectionBlock">
          <div className="sectionHeading">
            <div>
              <span className="kicker">{messages.home.featuredTitle}</span>
              <h2>{messages.home.featuredTitle}</h2>
            </div>
            <p>{messages.home.featuredBody}</p>
          </div>

          <div className="featureDeck">
            {featuredDestinations.map((destination, index) => (
              <DestinationCard
                key={destination.slug}
                destination={destination}
                locale={locale}
                className="destinationCardFeatured"
                priority={index < 2}
              />
            ))}
          </div>
        </RevealSection>

        <RevealSection className="sectionBlock">
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
                    <DestinationImage
                      destination={normalizedBySlug.get(region.sample.slug)!}
                      locale={locale}
                      className="destinationImage destinationImageCompact"
                    />
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
        </RevealSection>

        <RevealSection className="card plannerBanner">
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
        </RevealSection>
      </div>
    </main>
  );
}
