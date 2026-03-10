import type { DatasetDestination } from "@/types/dataset";

export const challengeDatasetVersion = "challenge-dataset.v1";

export const challengeDataset: DatasetDestination[] = [
  {
    id: "d_muscat_muttrah",
    slug: "muttrah-corniche",
    name: { en: "Muttrah Corniche", ar: "كورنيش مطرح" },
    description: {
      en: "Historic waterfront promenade with souq access.",
      ar: "واجهة بحرية تاريخية مع وصول مباشر إلى السوق."
    },
    region: { en: "Muscat", ar: "مسقط" },
    coordinates: { lat: 23.6177, lng: 58.5659 },
    categories: ["culture", "waterfront", "family"],
    recommended_months: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 180,
    crowd_level: 4,
    company: "Muttrah Waterfront"
  },
  {
    id: "d_nizwa_fort",
    slug: "nizwa-fort",
    name: { en: "Nizwa Fort", ar: "قلعة نزوى" },
    description: {
      en: "Iconic fortress and heritage district in Al Dakhiliyah.",
      ar: "حصن تاريخي بارز ومنطقة تراثية في الداخلية."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 22.9333, lng: 57.5333 },
    categories: ["culture", "history", "family"],
    recommended_months: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 5,
    avg_visit_duration_minutes: 240,
    crowd_level: 5,
    company: "Nizwa Fort"
  },
  {
    id: "d_jebel_akhdar",
    slug: "jebel-akhdar",
    name: { en: "Jebel Akhdar", ar: "الجبل الأخضر" },
    description: {
      en: "Cool mountain escapes, terraces, and canyon viewpoints.",
      ar: "ملاذ جبلي بارد مع مدرجات زراعية وإطلالات وديان."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 23.0726, lng: 57.6575 },
    categories: ["nature", "hiking", "romantic"],
    recommended_months: [3, 4, 5, 9, 10, 11],
    ticket_cost_omr: 12,
    avg_visit_duration_minutes: 480,
    crowd_level: 3,
    company: "Jebel Akhdar"
  },
  {
    id: "d_wahiba_sands",
    slug: "wahiba-sands",
    name: { en: "Wahiba Sands", ar: "رمال وهيبة" },
    description: {
      en: "Desert dunes with camp stays and stargazing experiences.",
      ar: "كثبان صحراوية مع مخيمات وتجارب مشاهدة النجوم."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.242, lng: 58.8047 },
    categories: ["adventure", "desert", "stargazing"],
    recommended_months: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 8,
    avg_visit_duration_minutes: 840,
    crowd_level: 4,
    company: "Wahiba Sands"
  },
  {
    id: "d_ras_al_jinz",
    slug: "ras-al-jinz",
    name: { en: "Ras Al Jinz Turtle Reserve", ar: "محمية رأس الجنز للسلاحف" },
    description: {
      en: "Conservation reserve known for turtle nesting tours.",
      ar: "محمية بيئية مشهورة بجولات مشاهدة تعشيش السلاحف."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.4273, lng: 59.8362 },
    categories: ["nature", "wildlife", "family"],
    recommended_months: [5, 6, 7, 8, 9],
    ticket_cost_omr: 6,
    avg_visit_duration_minutes: 300,
    crowd_level: 3,
    company: "Ras Al Jinz Turtle Reserve"
  },
  {
    id: "d_salalah_waterfalls",
    slug: "salalah-waterfalls",
    name: { en: "Salalah Waterfalls", ar: "شلالات صلالة" },
    description: {
      en: "Khareef-season greenery with dramatic cliffside cascades.",
      ar: "خضرة موسم الخريف مع شلالات منحدرات مدهشة."
    },
    region: { en: "Dhofar", ar: "ظفار" },
    coordinates: { lat: 17.0167, lng: 54.0924 },
    categories: ["nature", "waterfalls", "roadtrip"],
    recommended_months: [7, 8, 9],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 360,
    crowd_level: 2,
    company: "Salalah Waterfalls"
  }
];
