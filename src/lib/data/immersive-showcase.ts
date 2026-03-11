import type { DatasetDestination, DatasetRegionKey, Locale } from "@/types/dataset";

import { createBlurDataUrl } from "@/lib/ui/image-placeholders";

export const immersiveHeroImages = [
  {
    src: "/images/destinations/sultan-qaboos-mosque/1.jpg",
    width: 1800,
    height: 1200,
    blurDataURL: createBlurDataUrl("#1b4255", "#d7b387")
  },
  {
    src: "/images/destinations/jebel-akhdar/1.jpg",
    width: 1800,
    height: 1200,
    blurDataURL: createBlurDataUrl("#355f58", "#d4a574")
  },
  {
    src: "/images/destinations/mughsail-beach/1.jpg",
    width: 1800,
    height: 1200,
    blurDataURL: createBlurDataUrl("#1a6077", "#87c9cf")
  },
  {
    src: "/images/destinations/wahiba-sands/1.jpg",
    width: 1800,
    height: 1200,
    blurDataURL: createBlurDataUrl("#7e5133", "#d7b07d")
  }
];

export const regionAccentByKey: Record<DatasetRegionKey, string> = {
  muscat: "#0A4D5C",
  dakhiliya: "#8B6A47",
  sharqiya: "#D4A574",
  dhofar: "#4C8B6B",
  batinah: "#2E6F89",
  musandam: "#B86A42"
};

type ImmersiveCategoryId =
  | "mountain"
  | "desert"
  | "sea"
  | "culture"
  | "nature"
  | "adventure"
  | "heritage"
  | "urban";

interface ImmersiveCategoryConfig {
  id: ImmersiveCategoryId;
  href: string;
  image: {
    src: string;
    blurDataURL: string;
  };
  matcher: (destination: DatasetDestination) => boolean;
}

const categoryConfigs: ImmersiveCategoryConfig[] = [
  {
    id: "mountain",
    href: "?category=mountain",
    image: {
      src: "/images/destinations/jebel-akhdar/1.jpg",
      blurDataURL: createBlurDataUrl("#355f58", "#d4a574")
    },
    matcher: (destination) => destination.categories.includes("mountain")
  },
  {
    id: "desert",
    href: "?category=desert",
    image: {
      src: "/images/destinations/wahiba-sands/1.jpg",
      blurDataURL: createBlurDataUrl("#7e5133", "#d7b07d")
    },
    matcher: (destination) => destination.categories.includes("desert")
  },
  {
    id: "sea",
    href: "?category=beach",
    image: {
      src: "/images/destinations/mughsail-beach/1.jpg",
      blurDataURL: createBlurDataUrl("#1a6077", "#87c9cf")
    },
    matcher: (destination) => destination.categories.includes("beach")
  },
  {
    id: "culture",
    href: "?category=culture",
    image: {
      src: "/images/destinations/nizwa-fort/1.jpg",
      blurDataURL: createBlurDataUrl("#5a4a3f", "#d8bf9d")
    },
    matcher: (destination) => destination.categories.includes("culture")
  },
  {
    id: "nature",
    href: "?category=nature",
    image: {
      src: "/images/destinations/wadi-bani-khalid/1.jpg",
      blurDataURL: createBlurDataUrl("#2f6858", "#b9d8ca")
    },
    matcher: (destination) => destination.categories.includes("nature")
  },
  {
    id: "adventure",
    href: "?category=mountain",
    image: {
      src: "/images/destinations/jebel-shams/1.jpg",
      blurDataURL: createBlurDataUrl("#8a5f3f", "#d8a978")
    },
    matcher: (destination) =>
      destination.categories.includes("desert") ||
      destination.categories.includes("mountain") ||
      destination.avg_visit_duration_minutes >= 300
  },
  {
    id: "heritage",
    href: "?region=dakhiliya&category=culture",
    image: {
      src: "/images/destinations/bahla-fort/1.jpg",
      blurDataURL: createBlurDataUrl("#69503f", "#dec4a3")
    },
    matcher: (destination) =>
      destination.categories.includes("culture") && destination.region.en === "dakhiliya"
  },
  {
    id: "urban",
    href: "?region=muscat",
    image: {
      src: "/images/destinations/sultan-qaboos-mosque/1.jpg",
      blurDataURL: createBlurDataUrl("#284f5e", "#d7a97a")
    },
    matcher: (destination) => destination.region.en === "muscat"
  }
];

export function getImmersiveCategoryCards(destinations: DatasetDestination[], locale: Locale) {
  return categoryConfigs.map((config) => ({
    id: config.id,
    href: config.href,
    image: config.image,
    title:
      locale === "ar"
        ? {
            mountain: "جبال",
            desert: "صحراء",
            sea: "بحر",
            culture: "ثقافة",
            nature: "طبيعة",
            adventure: "مغامرة",
            heritage: "تراث",
            urban: "حضري"
          }[config.id]
        : {
            mountain: "Mountain",
            desert: "Desert",
            sea: "Sea",
            culture: "Culture",
            nature: "Nature",
            adventure: "Adventure",
            heritage: "Heritage",
            urban: "Urban"
          }[config.id],
    count: destinations.filter(config.matcher).length
  }));
}
