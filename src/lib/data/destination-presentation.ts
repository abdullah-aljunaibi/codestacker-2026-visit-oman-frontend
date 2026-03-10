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

const destinationHeroImages: Record<
  string,
  {
    src: string;
    theme: ImageTheme;
  }
> = {
  "muttrah-corniche": {
    src: "https://images.unsplash.com/photo-1661396707813-5f2b83570c26?auto=format&fit=crop&w=1200&q=80",
    theme: "culture"
  },
  "royal-opera-house-muscat": {
    src: "https://images.unsplash.com/photo-1666936885160-cac4d9ef7d24?auto=format&fit=crop&w=1200&q=80",
    theme: "urban"
  },
  "sultan-qaboos-grand-mosque": {
    src: "https://images.unsplash.com/photo-1719314096247-b3b3a72b4366?auto=format&fit=crop&w=1200&q=80",
    theme: "culture"
  },
  "qurum-beach": {
    src: "https://images.unsplash.com/photo-1621971600446-9a6da075d61d?auto=format&fit=crop&w=1200&q=80",
    theme: "sea"
  },
  "bimmah-sinkhole": {
    src: "https://images.unsplash.com/photo-1562602833-49e2f0c6d381?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "nizwa-fort": {
    src: "https://images.unsplash.com/photo-1708515780646-f44aec13169a?auto=format&fit=crop&w=1200&q=80",
    theme: "culture"
  },
  "jebel-akhdar": {
    src: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80",
    theme: "mountain"
  },
  "jebel-shams": {
    src: "https://images.unsplash.com/photo-1626095460016-8664dc341f69?auto=format&fit=crop&w=1200&q=80",
    theme: "adventure"
  },
  "misfat-al-abriyeen": {
    src: "https://images.unsplash.com/photo-1736719060852-3c4e45144374?auto=format&fit=crop&w=1200&q=80",
    theme: "heritage"
  },
  "bahla-fort": {
    src: "https://images.unsplash.com/photo-1578825397504-f07d109167c8?auto=format&fit=crop&w=1200&q=80",
    theme: "heritage"
  },
  "birkat-al-mouz": {
    src: "https://images.unsplash.com/photo-1736719060852-3c4e45144374?auto=format&fit=crop&w=1200&q=80",
    theme: "culture"
  },
  "wahiba-sands": {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    theme: "desert"
  },
  "ras-al-jinz": {
    src: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "wadi-bani-khalid": {
    src: "https://images.unsplash.com/photo-1562602833-49e2f0c6d381?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "sur-dhow-yard": {
    src: "https://images.unsplash.com/photo-1577587230708-187fdbef4d91?auto=format&fit=crop&w=1200&q=80",
    theme: "culture"
  },
  "fins-beach": {
    src: "https://images.unsplash.com/photo-1621971600446-9a6da075d61d?auto=format&fit=crop&w=1200&q=80",
    theme: "sea"
  },
  "salalah-waterfalls": {
    src: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "mughsail-beach": {
    src: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
    theme: "sea"
  },
  "anti-gravity-point": {
    src: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "jebel-samhan": {
    src: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
    theme: "mountain"
  },
  "nakhal-fort": {
    src: "https://images.unsplash.com/photo-1741503488678-3dda4194252f?auto=format&fit=crop&w=1200&q=80",
    theme: "heritage"
  },
  "ain-thowarah": {
    src: "https://images.unsplash.com/photo-1741503488678-3dda4194252f?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "sawadi-beach": {
    src: "https://images.unsplash.com/photo-1621971600446-9a6da075d61d?auto=format&fit=crop&w=1200&q=80",
    theme: "sea"
  },
  "khasab-fjords": {
    src: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    theme: "nature"
  },
  "telegraph-island": {
    src: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    theme: "sea"
  }
};

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
  const selected = destinationHeroImages[destination.slug];
  const theme = selected?.theme ?? pickTheme(destination);

  return {
    src: selected?.src ?? "https://images.unsplash.com/photo-1626095460016-8664dc341f69?auto=format&fit=crop&w=1200&q=80",
    width: imageDimensions.width,
    height: imageDimensions.height,
    theme
  };
}
