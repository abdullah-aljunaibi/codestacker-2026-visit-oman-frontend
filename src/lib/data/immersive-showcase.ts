import type { DatasetDestination, DatasetRegionKey, Locale } from "@/types/dataset";

import { createBlurDataUrl } from "@/lib/ui/image-placeholders";

export const immersiveHeroImage = {
  src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80",
  width: 1800,
  height: 1200,
  blurDataURL: createBlurDataUrl("#1c5360", "#c99666")
};

export const regionAccentByKey: Record<DatasetRegionKey, string> = {
  muscat: "#0A4D5C",
  dakhiliya: "#8B6A47",
  sharqiya: "#D4A574",
  dhofar: "#4C8B6B",
  batinah: "#2E6F89",
  dhahira: "#B86A42"
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
      src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      blurDataURL: createBlurDataUrl("#355f58", "#d4a574")
    },
    matcher: (destination) => destination.categories.includes("mountain")
  },
  {
    id: "desert",
    href: "?category=desert",
    image: {
      src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80",
      blurDataURL: createBlurDataUrl("#7e5133", "#d7b07d")
    },
    matcher: (destination) => destination.categories.includes("desert")
  },
  {
    id: "sea",
    href: "?category=beach",
    image: {
      src: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
      blurDataURL: createBlurDataUrl("#1a6077", "#87c9cf")
    },
    matcher: (destination) => destination.categories.includes("beach")
  },
  {
    id: "culture",
    href: "?category=culture",
    image: {
      src: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
      blurDataURL: createBlurDataUrl("#5a4a3f", "#d8bf9d")
    },
    matcher: (destination) => destination.categories.includes("culture")
  },
  {
    id: "nature",
    href: "?category=nature",
    image: {
      src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
      blurDataURL: createBlurDataUrl("#2f6858", "#b9d8ca")
    },
    matcher: (destination) => destination.categories.includes("nature")
  },
  {
    id: "adventure",
    href: "?category=mountain",
    image: {
      src: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80",
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
      src: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
      blurDataURL: createBlurDataUrl("#69503f", "#dec4a3")
    },
    matcher: (destination) =>
      destination.categories.includes("culture") && destination.region.en === "dakhiliya"
  },
  {
    id: "urban",
    href: "?region=muscat",
    image: {
      src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
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
