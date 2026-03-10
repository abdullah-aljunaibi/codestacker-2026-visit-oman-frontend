export const storageKeys = {
  locale: "visit-oman.locale.v1",
  interests: "visit-oman.interests.v2",
  plannerDraft: "visit-oman.planner-draft.v2",
  itinerary: "visit-oman.itinerary.v2",
  costBreakdown: "visit-oman.cost-breakdown.v2"
} as const;

export const legacyStorageKeys = {
  interests: ["visit-oman.interests.v1"],
  plannerDraft: ["visit-oman.planner-draft.v1"],
  itinerary: ["visit-oman.itinerary.v1"],
  costBreakdown: ["visit-oman.cost-breakdown.v1"]
} as const;
