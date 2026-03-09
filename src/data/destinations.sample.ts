import type { Destination } from "@/types/domain";

export const destinationsSample: Destination[] = [
  {
    id: "d_muscat_muttrah",
    slug: "muttrah-corniche",
    name: { en: "Muttrah Corniche", ar: "كورنيش مطرح" },
    description: {
      en: "Historic waterfront promenade with souq access.",
      ar: "واجهة بحرية تاريخية مع وصول مباشر إلى السوق."
    },
    region: "Muscat",
    coordinates: { lat: 23.6177, lng: 58.5659 },
    tags: ["culture", "waterfront", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    costLevel: "low",
    recommendedDurationHours: 3,
    popularityScore: 91
  },
  {
    id: "d_nizwa_fort",
    slug: "nizwa-fort",
    name: { en: "Nizwa Fort", ar: "قلعة نزوى" },
    description: {
      en: "Iconic fortress and heritage district in Al Dakhiliyah.",
      ar: "حصن تاريخي بارز ومنطقة تراثية في الداخلية."
    },
    region: "Al Dakhiliyah",
    coordinates: { lat: 22.9333, lng: 57.5333 },
    tags: ["culture", "history", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    costLevel: "medium",
    recommendedDurationHours: 4,
    popularityScore: 95
  },
  {
    id: "d_jebel_akhdar",
    slug: "jebel-akhdar",
    name: { en: "Jebel Akhdar", ar: "الجبل الأخضر" },
    description: {
      en: "Cool mountain escapes, terraces, and canyon viewpoints.",
      ar: "ملاذ جبلي بارد مع مدرجات زراعية وإطلالات وديان."
    },
    region: "Al Dakhiliyah",
    coordinates: { lat: 23.0726, lng: 57.6575 },
    tags: ["nature", "hiking", "romantic"],
    idealVisitMonths: [3, 4, 5, 9, 10, 11],
    costLevel: "high",
    recommendedDurationHours: 8,
    popularityScore: 88
  },
  {
    id: "d_wahiba_sands",
    slug: "wahiba-sands",
    name: { en: "Wahiba Sands", ar: "رمال وهيبة" },
    description: {
      en: "Desert dunes with camp stays and stargazing experiences.",
      ar: "كثبان صحراوية مع مخيمات وتجارب مشاهدة النجوم."
    },
    region: "Ash Sharqiyah",
    coordinates: { lat: 22.242, lng: 58.8047 },
    tags: ["adventure", "desert", "stargazing"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    costLevel: "medium",
    recommendedDurationHours: 14,
    popularityScore: 90
  },
  {
    id: "d_ras_al_jinz",
    slug: "ras-al-jinz",
    name: { en: "Ras Al Jinz Turtle Reserve", ar: "محمية رأس الجنز للسلاحف" },
    description: {
      en: "Conservation reserve known for turtle nesting tours.",
      ar: "محمية بيئية مشهورة بجولات مشاهدة تعشيش السلاحف."
    },
    region: "Ash Sharqiyah",
    coordinates: { lat: 22.4273, lng: 59.8362 },
    tags: ["nature", "wildlife", "family"],
    idealVisitMonths: [5, 6, 7, 8, 9],
    costLevel: "medium",
    recommendedDurationHours: 5,
    popularityScore: 82
  },
  {
    id: "d_salalah_waterfalls",
    slug: "salalah-waterfalls",
    name: { en: "Salalah Waterfalls", ar: "شلالات صلالة" },
    description: {
      en: "Khareef-season greenery with dramatic cliffside cascades.",
      ar: "خضرة موسم الخريف مع شلالات منحدرات مدهشة."
    },
    region: "Dhofar",
    coordinates: { lat: 17.0167, lng: 54.0924 },
    tags: ["nature", "waterfalls", "roadtrip"],
    idealVisitMonths: [7, 8, 9],
    costLevel: "low",
    recommendedDurationHours: 6,
    popularityScore: 86
  }
];
