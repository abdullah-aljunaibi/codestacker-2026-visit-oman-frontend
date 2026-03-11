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
    src: "https://experienceoman.om/media/pa2krj1m/mutrah-fort.jpg?width=1200",
    theme: "culture"
  },
  "royal-opera-house-muscat": {
    src: "https://experienceoman.om/media/mwxfuodr/royal-opera-house-muscat-2.jpg?width=1200",
    theme: "urban"
  },
  "sultan-qaboos-grand-mosque": {
    src: "https://experienceoman.om/media/qarjles4/sultanqaboosmosque-02.jpg?width=1200",
    theme: "culture"
  },
  "qurum-beach": {
    src: "https://experienceoman.om/media/ie1fe1se/al-qurum-park.jpeg?width=1200",
    theme: "sea"
  },
  "bimmah-sinkhole": {
    src: "https://experienceoman.om/media/b0igbyt5/sifah.jpg?width=1200",
    theme: "nature"
  },
  "nizwa-fort": {
    src: "https://experienceoman.om/media/wwpkr3b2/nizwa-fort.jpg?width=1200",
    theme: "culture"
  },
  "jebel-akhdar": {
    src: "https://experienceoman.om/media/qh1eyy5z/al-jabal-akhader-village.jpeg?width=1200",
    theme: "mountain"
  },
  "jebel-shams": {
    src: "https://experienceoman.om/media/pi5hwi50/jabal-sha-th.jpg?width=1200",
    theme: "adventure"
  },
  "misfat-al-abriyeen": {
    src: "https://experienceoman.om/media/hhclwfhp/rose-distillation.jpg?width=1200",
    theme: "heritage"
  },
  "bahla-fort": {
    src: "https://experienceoman.om/media/iwpckyac/bahla-fort.jpg?width=1200",
    theme: "heritage"
  },
  "birkat-al-mouz": {
    src: "https://experienceoman.om/media/0eqdlgni/2.jpg?width=1200",
    theme: "culture"
  },
  "wahiba-sands": {
    src: "https://experienceoman.om/media/uuya5lqu/bidiyah-sand.jpg?width=1200",
    theme: "desert"
  },
  "ras-al-jinz": {
    src: "https://experienceoman.om/media/gaqdbaks/ras-al-jinz-archeosite.jpg?width=1200",
    theme: "nature"
  },
  "wadi-bani-khalid": {
    src: "https://experienceoman.om/media/3xdbsftv/wadi-bani-khalid.jpg?width=1200",
    theme: "nature"
  },
  "sur-dhow-yard": {
    src: "https://experienceoman.om/media/j3vagryb/mutrah-riyam-park.jpg?width=1200",
    theme: "culture"
  },
  "fins-beach": {
    src: "https://experienceoman.om/media/b0igbyt5/sifah.jpg?width=1200",
    theme: "sea"
  },
  "salalah-waterfalls": {
    src: "https://experienceoman.om/media/cwtn32vw/wadi-darbat.jpg?width=1200",
    theme: "nature"
  },
  "mughsail-beach": {
    src: "https://experienceoman.om/media/2hxhk4q1/dhofar-mughsail-beach-salalah-dhofar-oman.jpg?width=1200",
    theme: "sea"
  },
  "anti-gravity-point": {
    src: "https://experienceoman.om/media/vislnyhx/rakhyut-sha-th.jpg?width=1200",
    theme: "nature"
  },
  "jebel-samhan": {
    src: "https://experienceoman.om/media/pi5hwi50/jabal-sha-th.jpg?width=1200",
    theme: "mountain"
  },
  "nakhal-fort": {
    src: "https://experienceoman.om/media/vuxgfzuq/khasab-fort-01.jpg?width=1200",
    theme: "heritage"
  },
  "ain-thowarah": {
    src: "https://experienceoman.om/media/4k2j2wv2/wadi-darbat-02.jpg?width=1200",
    theme: "nature"
  },
  "sawadi-beach": {
    src: "https://experienceoman.om/media/b0igbyt5/sifah.jpg?width=1200",
    theme: "sea"
  },
  "khasab-fjords": {
    src: "https://experienceoman.om/media/vuxgfzuq/khasab-fort-01.jpg?width=1200",
    theme: "nature"
  },
  "telegraph-island": {
    src: "https://experienceoman.om/media/xoxl013q/khasab-fort-02.jpg?width=1200",
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
    src: selected?.src ?? "https://experienceoman.om/media/3xdbsftv/wadi-bani-khalid.jpg?width=1200",
    width: imageDimensions.width,
    height: imageDimensions.height,
    theme
  };
}
