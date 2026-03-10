import type { DatasetDestination } from "@/types/dataset";

export const challengeDatasetVersion = "challenge-dataset.v2";

export const challengeDataset: DatasetDestination[] = [
  {
    id: "d_muscat_muttrah",
    slug: "muttrah-corniche",
    name: { en: "Muttrah Corniche", ar: "كورنيش مطرح" },
    description: {
      en: "Historic seafront promenade linking the harbour, souq, and old-town viewpoints.",
      ar: "واجهة بحرية تاريخية تربط الميناء والسوق والإطلالات المطلة على المدينة القديمة."
    },
    region: { en: "Muscat", ar: "مسقط" },
    coordinates: { lat: 23.6177, lng: 58.5659 },
    categories: ["culture", "waterfront", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 180,
    crowd_level: 4,
    company: "Muttrah Waterfront"
  },
  {
    id: "d_muscat_opera",
    slug: "royal-opera-house-muscat",
    name: { en: "Royal Opera House Muscat", ar: "دار الأوبرا السلطانية مسقط" },
    description: {
      en: "Landmark performance venue with guided tours, arcades, and evening shows.",
      ar: "معلم ثقافي بارز يضم جولات تعريفية وأروقة أنيقة وعروضاً مسائية."
    },
    region: { en: "Muscat", ar: "مسقط" },
    coordinates: { lat: 23.5943, lng: 58.4084 },
    categories: ["culture", "architecture", "romantic"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 8,
    avg_visit_duration_minutes: 120,
    crowd_level: 3,
    company: "Royal Opera House Muscat"
  },
  {
    id: "d_muscat_grand_mosque",
    slug: "sultan-qaboos-grand-mosque",
    name: { en: "Sultan Qaboos Grand Mosque", ar: "جامع السلطان قابوس الأكبر" },
    description: {
      en: "Grand mosque known for its prayer hall, gardens, and Islamic design details.",
      ar: "جامع كبير يشتهر بقاعة الصلاة والحدائق والتفاصيل المعمارية الإسلامية."
    },
    region: { en: "Muscat", ar: "مسقط" },
    coordinates: { lat: 23.5831, lng: 58.3985 },
    categories: ["culture", "architecture", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 150,
    crowd_level: 4,
    company: "Grand Mosque Visitor Centre"
  },
  {
    id: "d_muscat_qurum",
    slug: "qurum-beach",
    name: { en: "Qurum Beach", ar: "شاطئ القرم" },
    description: {
      en: "Broad city beach for walking, cafes, and sunset views over the Gulf of Oman.",
      ar: "شاطئ حضري واسع مناسب للمشي والمقاهي ومشاهدة الغروب على خليج عمان."
    },
    region: { en: "Muscat", ar: "مسقط" },
    coordinates: { lat: 23.6145, lng: 58.4614 },
    categories: ["beach", "family", "waterfront"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 150,
    crowd_level: 3,
    company: "Qurum Beachfront"
  },
  {
    id: "d_muscat_bimmah",
    slug: "bimmah-sinkhole",
    name: { en: "Bimmah Sinkhole", ar: "هوية نجم" },
    description: {
      en: "Limestone sinkhole with turquoise water popular for short swims and roadside stops.",
      ar: "فجوة جيرية بمياه فيروزية تشتهر بالسباحة القصيرة والتوقفات أثناء الرحلات البرية."
    },
    region: { en: "Muscat", ar: "مسقط" },
    coordinates: { lat: 22.8819, lng: 59.2456 },
    categories: ["nature", "swimming", "roadtrip"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 120,
    crowd_level: 4,
    company: "Hawiyat Najm Park"
  },
  {
    id: "d_dakhiliyah_nizwa_fort",
    slug: "nizwa-fort",
    name: { en: "Nizwa Fort", ar: "قلعة نزوى" },
    description: {
      en: "Iconic fort complex beside the traditional souq and old neighbourhood lanes.",
      ar: "قلعة شهيرة بجوار السوق التقليدي وأزقة الحي القديم."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 22.9333, lng: 57.5333 },
    categories: ["culture", "history", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 5,
    avg_visit_duration_minutes: 240,
    crowd_level: 5,
    company: "Nizwa Fort"
  },
  {
    id: "d_dakhiliyah_jebel_akhdar",
    slug: "jebel-akhdar",
    name: { en: "Jebel Akhdar", ar: "الجبل الأخضر" },
    description: {
      en: "Cool highlands with terrace farms, village walks, and canyon viewpoints.",
      ar: "مرتفعات باردة تضم مدرجات زراعية ومسارات قرى وإطلالات خلابة على الأودية."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 23.0726, lng: 57.6575 },
    categories: ["nature", "hiking", "romantic"],
    idealVisitMonths: [3, 4, 5, 9, 10, 11],
    ticket_cost_omr: 12,
    avg_visit_duration_minutes: 480,
    crowd_level: 3,
    company: "Jebel Akhdar Escapes"
  },
  {
    id: "d_dakhiliyah_jebel_shams",
    slug: "jebel-shams",
    name: { en: "Jebel Shams", ar: "جبل شمس" },
    description: {
      en: "Oman's highest mountain with balcony walks and dramatic canyon scenery.",
      ar: "أعلى قمة في عُمان مع ممشى الشرفة ومناظر الوادي العميقة."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 23.2364, lng: 57.2029 },
    categories: ["nature", "hiking", "adventure"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 3,
    avg_visit_duration_minutes: 360,
    crowd_level: 3,
    company: "Jebel Shams Adventures"
  },
  {
    id: "d_dakhiliyah_misfat",
    slug: "misfat-al-abriyeen",
    name: { en: "Misfat Al Abriyeen", ar: "مسفاة العبريين" },
    description: {
      en: "Stone mountain village with falaj irrigation lanes and palm terraces.",
      ar: "قرية جبلية حجرية تتميز بأفلاجها وممراتها ومدرجاتها المزروعة بالنخيل."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 23.1226, lng: 57.3124 },
    categories: ["culture", "nature", "walking"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 180,
    crowd_level: 2,
    company: "Misfat Heritage Walks"
  },
  {
    id: "d_dakhiliyah_bahla",
    slug: "bahla-fort",
    name: { en: "Bahla Fort", ar: "قلعة بهلاء" },
    description: {
      en: "UNESCO-listed mud-brick fort surrounded by oasis settlements and pottery heritage.",
      ar: "قلعة طينية مدرجة في اليونسكو تحيط بها الواحات وتراث صناعة الفخار."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 22.9647, lng: 57.3047 },
    categories: ["history", "culture", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 3,
    avg_visit_duration_minutes: 150,
    crowd_level: 2,
    company: "Bahla Fort"
  },
  {
    id: "d_dakhiliyah_birkat",
    slug: "birkat-al-mouz",
    name: { en: "Birkat Al Mouz", ar: "بركة الموز" },
    description: {
      en: "Oasis village at the foot of the mountains with falaj paths and date palms.",
      ar: "واحة عند سفح الجبال تضم مسارات الأفلاج وبساتين النخيل."
    },
    region: { en: "Al Dakhiliyah", ar: "الداخلية" },
    coordinates: { lat: 22.9276, lng: 57.6757 },
    categories: ["culture", "nature", "photography"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 120,
    crowd_level: 2,
    company: "Birkat Oasis Trails"
  },
  {
    id: "d_sharqiyah_wahiba",
    slug: "wahiba-sands",
    name: { en: "Wahiba Sands", ar: "رمال وهيبة" },
    description: {
      en: "Rolling desert dunes with camp stays, dune drives, and stargazing nights.",
      ar: "كثبان رملية ممتدة مع مخيمات صحراوية وجولات على الكثبان وليالٍ مرصعة بالنجوم."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.242, lng: 58.8047 },
    categories: ["adventure", "desert", "stargazing"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 8,
    avg_visit_duration_minutes: 840,
    crowd_level: 4,
    company: "Sharqiyah Sands Camps"
  },
  {
    id: "d_sharqiyah_ras_al_jinz",
    slug: "ras-al-jinz",
    name: { en: "Ras Al Jinz Turtle Reserve", ar: "محمية رأس الجنز للسلاحف" },
    description: {
      en: "Protected nesting beach offering guided turtle-watching experiences.",
      ar: "شاطئ محمي لتعشيش السلاحف مع جولات إرشادية لمشاهدتها."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.4273, lng: 59.8362 },
    categories: ["nature", "wildlife", "family"],
    idealVisitMonths: [5, 6, 7, 8, 9],
    ticket_cost_omr: 6,
    avg_visit_duration_minutes: 300,
    crowd_level: 3,
    company: "Ras Al Jinz Turtle Reserve"
  },
  {
    id: "d_sharqiyah_wadi_bani_khalid",
    slug: "wadi-bani-khalid",
    name: { en: "Wadi Bani Khalid", ar: "وادي بني خالد" },
    description: {
      en: "Palm-lined wadi pools ideal for swimming, picnics, and short cliff walks.",
      ar: "وادي تحيط به النخيل وبرك مائية مناسبة للسباحة والنزهات والمشي القصير."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.6142, lng: 59.0911 },
    categories: ["nature", "swimming", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 240,
    crowd_level: 4,
    company: "Wadi Bani Khalid"
  },
  {
    id: "d_sharqiyah_sur",
    slug: "sur-dhow-yard",
    name: { en: "Sur Dhow Yard", ar: "ورشة صناعة السفن في صور" },
    description: {
      en: "Historic dhow-building quarter highlighting Oman's maritime craftsmanship.",
      ar: "حي تاريخي لصناعة السفن يعرض مهارات عُمان البحرية التقليدية."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.5667, lng: 59.5289 },
    categories: ["culture", "history", "waterfront"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 2,
    avg_visit_duration_minutes: 90,
    crowd_level: 2,
    company: "Sur Maritime Heritage"
  },
  {
    id: "d_sharqiyah_fins",
    slug: "fins-beach",
    name: { en: "Fins Beach", ar: "شاطئ فنس" },
    description: {
      en: "White-pebble coast with clear water and easy roadside access from Muscat.",
      ar: "شاطئ بحصى بيضاء ومياه صافية مع وصول سهل على الطريق الساحلي."
    },
    region: { en: "Ash Sharqiyah", ar: "الشرقية" },
    coordinates: { lat: 22.8187, lng: 59.2305 },
    categories: ["beach", "roadtrip", "swimming"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 180,
    crowd_level: 3,
    company: "Fins Coast"
  },
  {
    id: "d_dhofar_salalah_gardens",
    slug: "salalah-waterfalls",
    name: { en: "Ayn Khor Waterfalls", ar: "شلالات عين كور" },
    description: {
      en: "Khareef-season waterfalls and misty greenery on the hills around Salalah.",
      ar: "شلالات موسمية وخضرة ضبابية على مرتفعات صلالة خلال موسم الخريف."
    },
    region: { en: "Dhofar", ar: "ظفار" },
    coordinates: { lat: 17.0167, lng: 54.0924 },
    categories: ["nature", "waterfalls", "roadtrip"],
    idealVisitMonths: [7, 8, 9],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 210,
    crowd_level: 4,
    company: "Dhofar Nature Sites"
  },
  {
    id: "d_dhofar_mughsail",
    slug: "mughsail-beach",
    name: { en: "Mughsail Beach", ar: "شاطئ المغسيل" },
    description: {
      en: "Long sandy coast with dramatic cliffs, blowholes, and scenic drives.",
      ar: "شاطئ رملي طويل مع منحدرات ونوافير طبيعية وطريق ساحلي جميل."
    },
    region: { en: "Dhofar", ar: "ظفار" },
    coordinates: { lat: 16.8772, lng: 53.7809 },
    categories: ["beach", "nature", "roadtrip"],
    idealVisitMonths: [7, 8, 9, 10, 11],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 180,
    crowd_level: 3,
    company: "Mughsail Coast"
  },
  {
    id: "d_dhofar_anti_gravity",
    slug: "anti-gravity-point",
    name: { en: "Anti-Gravity Point", ar: "نقطة الجاذبية" },
    description: {
      en: "Roadside curiosity near Salalah known for its optical uphill illusion.",
      ar: "موقع طريف قرب صلالة يشتهر بخداع بصري يجعل المركبات تبدو وكأنها تصعد."
    },
    region: { en: "Dhofar", ar: "ظفار" },
    coordinates: { lat: 17.1153, lng: 54.1048 },
    categories: ["roadtrip", "family", "photography"],
    idealVisitMonths: [7, 8, 9, 10, 11, 12],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 45,
    crowd_level: 2,
    company: "Salalah Scenic Route"
  },
  {
    id: "d_dhofar_samhan",
    slug: "jebel-samhan",
    name: { en: "Jebel Samhan", ar: "جبل سمحان" },
    description: {
      en: "Escarpment viewpoints over Dhofar's cliffs, clouds, and monsoon landscapes.",
      ar: "إطلالات مرتفعة على منحدرات ظفار وسحبها ومناظرها الموسمية."
    },
    region: { en: "Dhofar", ar: "ظفار" },
    coordinates: { lat: 17.1726, lng: 54.8116 },
    categories: ["nature", "hiking", "photography"],
    idealVisitMonths: [7, 8, 9, 10],
    ticket_cost_omr: 2,
    avg_visit_duration_minutes: 240,
    crowd_level: 2,
    company: "Jebel Samhan Reserve"
  },
  {
    id: "d_batinah_nakhal",
    slug: "nakhal-fort",
    name: { en: "Nakhal Fort", ar: "حصن نخل" },
    description: {
      en: "Restored hilltop fort overlooking date plantations and mountain foothills.",
      ar: "حصن مرمم على تلة يطل على مزارع النخيل وسفوح الجبال."
    },
    region: { en: "Al Batinah", ar: "الباطنة" },
    coordinates: { lat: 23.3936, lng: 57.8242 },
    categories: ["history", "culture", "family"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 3,
    avg_visit_duration_minutes: 120,
    crowd_level: 3,
    company: "Nakhal Fort"
  },
  {
    id: "d_batinah_hot_springs",
    slug: "ain-thowarah",
    name: { en: "Ain Thowarah Hot Springs", ar: "عين الثوارة" },
    description: {
      en: "Shaded hot spring walk near Nakhal, popular for gentle strolls and picnics.",
      ar: "ممشى عين حارة قرب نخل يشتهر بالنزهات الهادئة والجلوس بين الظلال."
    },
    region: { en: "Al Batinah", ar: "الباطنة" },
    coordinates: { lat: 23.4019, lng: 57.8152 },
    categories: ["nature", "family", "walking"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3],
    ticket_cost_omr: 0,
    avg_visit_duration_minutes: 90,
    crowd_level: 3,
    company: "Ain Thowarah Springs"
  },
  {
    id: "d_batinah_sawadi",
    slug: "sawadi-beach",
    name: { en: "Sawadi Beach", ar: "شاطئ السوادي" },
    description: {
      en: "North-coast beach known for island views, boating, and relaxed family outings.",
      ar: "شاطئ على الساحل الشمالي يشتهر بإطلالات الجزر ورحلات القوارب والنزهات العائلية."
    },
    region: { en: "Al Batinah", ar: "الباطنة" },
    coordinates: { lat: 23.7854, lng: 57.7938 },
    categories: ["beach", "family", "boating"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 2,
    avg_visit_duration_minutes: 180,
    crowd_level: 3,
    company: "Sawadi Coast"
  },
  {
    id: "d_musandam_khasab",
    slug: "khasab-fjords",
    name: { en: "Khasab Fjords", ar: "خلجان خصب" },
    description: {
      en: "Dhow cruises through Musandam's dramatic inlets with dolphin sightings and coves.",
      ar: "رحلات بحرية عبر خلجان مسندم الخلابة مع مشاهدة الدلافين والخلجان الهادئة."
    },
    region: { en: "Musandam", ar: "مسندم" },
    coordinates: { lat: 26.1924, lng: 56.2477 },
    categories: ["waterfront", "nature", "boating"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 18,
    avg_visit_duration_minutes: 300,
    crowd_level: 3,
    company: "Khasab Dhow Cruises"
  },
  {
    id: "d_musandam_telegraph",
    slug: "telegraph-island",
    name: { en: "Telegraph Island", ar: "جزيرة التلغراف" },
    description: {
      en: "Historic island stop on fjord cruises, popular for snorkeling in clear water.",
      ar: "جزيرة تاريخية ضمن رحلات الخلجان وتشتهر بالسباحة السطحية في المياه الصافية."
    },
    region: { en: "Musandam", ar: "مسندم" },
    coordinates: { lat: 26.2193, lng: 56.3358 },
    categories: ["history", "boating", "snorkeling"],
    idealVisitMonths: [10, 11, 12, 1, 2, 3, 4],
    ticket_cost_omr: 20,
    avg_visit_duration_minutes: 240,
    crowd_level: 2,
    company: "Musandam Sea Adventures"
  }
];
