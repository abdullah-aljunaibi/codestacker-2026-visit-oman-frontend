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

  return {
    src: destination.image,
    width: imageDimensions.width,
    height: imageDimensions.height,
    theme
  };
}
