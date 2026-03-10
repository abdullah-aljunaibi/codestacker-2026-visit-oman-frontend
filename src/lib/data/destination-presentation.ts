import { getCategoryLabel, getMonthLabel } from "@/lib/i18n/messages";
import type { DatasetDestination, Locale, LocalizedText } from "@/types/dataset";

type ImageTheme =
  | "mountain"
  | "desert"
  | "sea"
  | "culture"
  | "nature"
  | "adventure"
  | "heritage"
  | "urban";

const imageDimensions = {
  width: 1200,
  height: 800
} as const;

const imageThemes: Record<ImageTheme, string[]> = {
  mountain: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1464820453369-31d2c0b651af?auto=format&fit=crop&w=1200&q=80"
  ],
  desert: [
    "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=1200&q=80"
  ],
  sea: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80"
  ],
  culture: [
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80"
  ],
  nature: [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
  ],
  adventure: [
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80"
  ],
  heritage: [
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1200&q=80"
  ],
  urban: [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
  ]
};

function stableHash(value: string): number {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function pickTheme(destination: DatasetDestination): ImageTheme {
  const { categories, crowd_level, avg_visit_duration_minutes, region } = destination;

  if (categories.includes("desert")) {
    return "desert";
  }

  if (categories.includes("mountain") && avg_visit_duration_minutes >= 300) {
    return "adventure";
  }

  if (categories.includes("mountain")) {
    return "mountain";
  }

  if (categories.includes("beach")) {
    return crowd_level >= 4 && region.en === "muscat" ? "urban" : "sea";
  }

  if (categories.includes("culture")) {
    return crowd_level <= 2 ? "heritage" : "culture";
  }

  return categories.includes("nature") ? "nature" : "urban";
}

function joinMonths(months: number[], locale: Locale): string {
  if (months.length === 0) {
    return locale === "ar" ? "على مدار العام" : "year-round";
  }

  const selected = months.slice(0, 3).map((month) => getMonthLabel(month, locale));
  return selected.join(locale === "ar" ? "، " : ", ");
}

function getCrowdCopy(level: number, locale: Locale): string {
  if (locale === "ar") {
    if (level <= 2) return "وتيرة هادئة تمنحك مساحة أوسع للاستمتاع بالمكان";
    if (level === 3) return "حركة متوازنة تناسب الزيارة المريحة";
    return "أجواء نابضة تستحق الوصول المبكر أو الزيارة خارج الذروة";
  }

  if (level <= 2) return "a calmer rhythm that gives you room to slow down";
  if (level === 3) return "a balanced flow that still feels easy to explore";
  return "a lively atmosphere that rewards an early start or off-peak timing";
}

function getVisitCopy(durationHours: number, locale: Locale): string {
  if (locale === "ar") {
    if (durationHours <= 1.5) return "وهي مناسبة لتوقف قصير";
    if (durationHours <= 3) return "وتمنحك زيارة نصف يوم مريحة";
    return "وتستحق أن تخصص لها جزءاً كبيراً من اليوم";
  }

  if (durationHours <= 1.5) return "and it works well as a shorter stop";
  if (durationHours <= 3) return "and it fits comfortably into a half-day outing";
  return "and it deserves a longer stretch of your day";
}

function getThemeCopy(destination: DatasetDestination, locale: Locale): string {
  const categoryLabels = destination.categories.map((category) => getCategoryLabel(category, locale));
  const primary = categoryLabels[0];
  const secondary = categoryLabels[1];

  if (locale === "ar") {
    if (secondary) {
      return `يجمع بين أجواء ${primary} ولمسات ${secondary}`;
    }

    return `يقدم تجربة ${primary} واضحة المعالم`;
  }

  if (secondary) {
    return `blending ${primary.toLowerCase()} appeal with ${secondary.toLowerCase()} moments`;
  }

  return `offering a distinctive ${primary.toLowerCase()} experience`;
}

export function buildDestinationDescription(destination: DatasetDestination): LocalizedText {
  const durationHours =
    Math.round(((destination.avg_visit_duration_minutes / 60) + Number.EPSILON) * 10) / 10;
  const seasonEn = joinMonths(destination.recommended_months, "en");
  const seasonAr = joinMonths(destination.recommended_months, "ar");

  return {
    en: `${destination.name.en} is best enjoyed around ${seasonEn}, ${getThemeCopy(destination, "en")}, with ${getCrowdCopy(destination.crowd_level, "en")} ${getVisitCopy(durationHours, "en")}.`,
    ar: `${destination.name.ar} تتألق غالباً بين ${seasonAr}، ${getThemeCopy(destination, "ar")}، مع ${getCrowdCopy(destination.crowd_level, "ar")} ${getVisitCopy(durationHours, "ar")}.`
  };
}

export function getDestinationHeroImage(destination: DatasetDestination) {
  const theme = pickTheme(destination);
  const options = imageThemes[theme];
  const index = stableHash(destination.slug) % options.length;

  return {
    src: options[index],
    width: imageDimensions.width,
    height: imageDimensions.height,
    theme
  };
}
