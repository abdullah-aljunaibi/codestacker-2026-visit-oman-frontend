import type { Locale } from "@/types/domain";

interface DiscoveryCopy {
  siteTitle: string;
  navDiscover: string;
  navPlanner: string;
  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  sectionsTitle: string;
  regionsTitle: string;
  quickFactsTitle: string;
  discoverTitle: string;
  discoverBody: string;
  filtersTitle: string;
  filterRegion: string;
  filterTag: string;
  filterBudget: string;
  sortLabel: string;
  allRegions: string;
  allTags: string;
  allBudgets: string;
  cardsLabel: string;
  emptyState: string;
  detailBack: string;
  detailBestMonths: string;
  detailDuration: string;
  detailRelated: string;
}

const copy: Record<Locale, DiscoveryCopy> = {
  en: {
    siteTitle: "Visit Oman",
    navDiscover: "Discover",
    navPlanner: "Planner",
    heroKicker: "CodeStacker 2026",
    heroTitle: "Where mountains, wadis, and coastlines meet.",
    heroBody:
      "Build your trip starting from curated destinations across Muscat, Dhofar, Al Dakhiliyah, and Ash Sharqiyah.",
    ctaPrimary: "Explore destinations",
    ctaSecondary: "Start planning",
    sectionsTitle: "Travel styles",
    regionsTitle: "Browse by region",
    quickFactsTitle: "Trip snapshot",
    discoverTitle: "Discover Oman",
    discoverBody: "Server-rendered listings with locale-ready filters and sorting.",
    filtersTitle: "Refine your search",
    filterRegion: "Region",
    filterTag: "Theme",
    filterBudget: "Budget",
    sortLabel: "Sort",
    allRegions: "All regions",
    allTags: "All themes",
    allBudgets: "Any budget",
    cardsLabel: "destinations",
    emptyState: "No destinations match these filters yet.",
    detailBack: "Back to discovery",
    detailBestMonths: "Best months",
    detailDuration: "Recommended duration",
    detailRelated: "More in this region"
  },
  ar: {
    siteTitle: "اكتشف عُمان",
    navDiscover: "اكتشف",
    navPlanner: "المخطط",
    heroKicker: "كودستاكر 2026",
    heroTitle: "حيث تلتقي الجبال والأودية والسواحل.",
    heroBody: "ابدأ رحلتك عبر وجهات مختارة من مسقط وظفار والداخلية والشرقية.",
    ctaPrimary: "استكشف الوجهات",
    ctaSecondary: "ابدأ التخطيط",
    sectionsTitle: "أنماط السفر",
    regionsTitle: "تصفح حسب المنطقة",
    quickFactsTitle: "ملخص الرحلة",
    discoverTitle: "اكتشف عُمان",
    discoverBody: "قوائم خادمية مع بنية جاهزة للتصفية والترتيب حسب اللغة.",
    filtersTitle: "خصص نتائجك",
    filterRegion: "المنطقة",
    filterTag: "النمط",
    filterBudget: "الميزانية",
    sortLabel: "الترتيب",
    allRegions: "كل المناطق",
    allTags: "كل الأنماط",
    allBudgets: "أي ميزانية",
    cardsLabel: "وجهات",
    emptyState: "لا توجد وجهات مطابقة لهذه التصفية حالياً.",
    detailBack: "العودة إلى الاكتشاف",
    detailBestMonths: "أفضل الأشهر",
    detailDuration: "المدة المقترحة",
    detailRelated: "وجهات أخرى في المنطقة"
  }
};

export function getDiscoveryCopy(locale: Locale): DiscoveryCopy {
  return copy[locale];
}
