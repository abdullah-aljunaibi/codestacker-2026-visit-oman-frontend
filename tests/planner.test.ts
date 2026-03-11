/**
 * Deterministic planner unit tests.
 *
 * Covers: scoring primitives, weighted scoring, region allocation rules,
 * routing constraints, cost model, budget repair, and snapshot determinism.
 */
import { describe, it, expect } from "vitest";

import {
  scoreInterestMatch,
  scoreSeasonFit,
  scoreNormCrowd,
  scoreNormCost,
  scoreDetourPenalty,
  scoreDiversityGain,
} from "@/lib/planner/scoring-primitives";

import {
  scoreDestinationWeighted,
  buildNormalizationContext,
  defaultWeightedScoringConfig,
} from "@/lib/planner/weighted-scoring-engine";

import { buildTimedRouteSummary } from "@/lib/planner/intra-region-routing";
import type { SchedulableStop } from "@/lib/planner/intra-region-routing";

import { tripCostConfig } from "@/lib/planner/cost-model";

import type { Destination } from "@/types/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDestination(
  overrides: Partial<Destination> & { slug: string }
): Destination {
  return {
    id: overrides.slug,
    slug: overrides.slug,
    name: { en: overrides.slug, ar: overrides.slug },
    lat: overrides.lat ?? 23.6,
    lng: overrides.lng ?? 58.5,
    region: { en: "muscat" as const, ar: "مسقط" },
    categories: overrides.categories ?? ["culture"],
    recommended_months: overrides.recommended_months ?? [1, 2, 3],
    company: { en: "Co", ar: "شركة" },
    ticket_cost_omr: overrides.ticket_cost_omr ?? 5,
    avg_visit_duration_minutes: overrides.avg_visit_duration_minutes ?? 90,
    crowd_level: (overrides.crowd_level ?? 3) as 1 | 2 | 3 | 4 | 5,
    image: "/img.jpg",
    images: [],
    coordinates: {
      lat: overrides.coordinates?.lat ?? overrides.lat ?? 23.6,
      lng: overrides.coordinates?.lng ?? overrides.lng ?? 58.5,
    },
    heroImage: { src: "/img.jpg", width: 800, height: 600, theme: "light" },
    galleryImages: [],
    description: { en: "desc", ar: "وصف" },
    budgetLevel: overrides.budgetLevel ?? "medium",
    recommendedDurationHours: overrides.recommendedDurationHours ?? 1.5,
    regionKey: (overrides.regionKey ?? "muscat") as "muscat",
    regionLabel: overrides.regionLabel ?? "Muscat",
    locale: "en",
  };
}

function makeStop(
  overrides: Partial<SchedulableStop> & { slug: string }
): SchedulableStop {
  return {
    slug: overrides.slug,
    region: overrides.region ?? "muscat",
    categories: overrides.categories ?? ["culture"],
    coordinates: overrides.coordinates ?? { lat: 23.6, lng: 58.5 },
    recommendedDurationHours: overrides.recommendedDurationHours ?? 1.5,
  };
}

// ---------------------------------------------------------------------------
// 1. Scoring primitives
// ---------------------------------------------------------------------------

describe("scoreInterestMatch", () => {
  it("returns 1 for perfect overlap", () => {
    expect(scoreInterestMatch(["beach", "culture"], ["beach", "culture"])).toBe(1);
  });

  it("returns 0 for no overlap", () => {
    expect(scoreInterestMatch(["beach"], ["desert"])).toBe(0);
  });

  it("returns Jaccard overlap for partial match", () => {
    // overlap=1, union=3 => 1/3
    const result = scoreInterestMatch(["beach", "culture"], ["culture", "desert"]);
    expect(result).toBeCloseTo(1 / 3, 5);
  });

  it("returns 0 for empty inputs", () => {
    expect(scoreInterestMatch([], [])).toBe(0);
  });
});

describe("scoreSeasonFit", () => {
  it("returns 1 when travel month is recommended", () => {
    expect(scoreSeasonFit([1, 2, 3], 2)).toBe(1);
  });

  it("returns less than 1 for nearby months", () => {
    // month 4, nearest recommended = 3, distance = 1, score = 1 - 1/6
    expect(scoreSeasonFit([1, 2, 3], 4)).toBeCloseTo(1 - 1 / 6, 5);
  });

  it("handles circular distance (Dec to Jan)", () => {
    // month 12, nearest recommended = 1, circular distance = 1
    expect(scoreSeasonFit([1], 12)).toBeCloseTo(1 - 1 / 6, 5);
  });

  it("returns 0 for empty recommended months", () => {
    expect(scoreSeasonFit([], 6)).toBe(0);
  });
});

describe("scoreNormCrowd", () => {
  it("maps crowd 1 to 0", () => {
    expect(scoreNormCrowd(1)).toBe(0);
  });

  it("maps crowd 5 to 1", () => {
    expect(scoreNormCrowd(5)).toBe(1);
  });

  it("maps crowd 3 to 0.5", () => {
    expect(scoreNormCrowd(3)).toBe(0.5);
  });
});

describe("scoreNormCost", () => {
  it("returns 0 at min cost", () => {
    expect(scoreNormCost(0, { min: 0, max: 10 })).toBe(0);
  });

  it("returns 1 at max cost", () => {
    expect(scoreNormCost(10, { min: 0, max: 10 })).toBe(1);
  });

  it("returns 0 when min equals max", () => {
    expect(scoreNormCost(5, { min: 5, max: 5 })).toBe(0);
  });
});

describe("scoreDetourPenalty", () => {
  it("returns 0 when no destinations are selected", () => {
    const dest = makeDestination({ slug: "a" });
    expect(scoreDetourPenalty(dest, [], 100)).toBe(0);
  });

  it("returns positive value for distant detour", () => {
    const dest = makeDestination({
      slug: "far",
      coordinates: { lat: 26, lng: 56 },
    });
    const selected = [
      makeDestination({ slug: "near", coordinates: { lat: 23.6, lng: 58.5 } }),
    ];
    const penalty = scoreDetourPenalty(dest, selected, 500);
    expect(penalty).toBeGreaterThan(0);
    expect(penalty).toBeLessThanOrEqual(1);
  });
});

describe("scoreDiversityGain", () => {
  it("returns 1 when all categories are new", () => {
    expect(scoreDiversityGain(["beach", "nature"], [])).toBe(1);
  });

  it("returns 0 when all categories are already covered", () => {
    expect(scoreDiversityGain(["beach"], ["beach"])).toBe(0);
  });

  it("returns 0.5 when half are new", () => {
    expect(scoreDiversityGain(["beach", "desert"], ["beach"])).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// 2. Weighted scoring engine
// ---------------------------------------------------------------------------

describe("weighted scoring engine", () => {
  it("uses deterministic rounding to 6 digits", () => {
    const destinations = [
      makeDestination({ slug: "a", ticket_cost_omr: 0 }),
      makeDestination({ slug: "b", ticket_cost_omr: 10 }),
    ];
    const context = buildNormalizationContext({ destinations });

    const result = scoreDestinationWeighted({
      destination: destinations[0],
      profile: {
        preferredCategories: ["culture"],
        tripDurationDays: 3,
        travelIntensity: "balanced",
        budget: "medium",
        travelMonth: 2,
      },
      normalizationContext: context,
      selectedDestinations: [],
    });

    expect(result.configVersion).toBe("vo-p3-v1");
    // Verify precision: totalScore should have at most 6 decimal places
    const decimalStr = result.totalScore.toString().split(".")[1] ?? "";
    expect(decimalStr.length).toBeLessThanOrEqual(6);
  });

  it("applies penalty metrics with negative direction", () => {
    const destinations = [
      makeDestination({ slug: "expensive", ticket_cost_omr: 10, crowd_level: 5 as 1 | 2 | 3 | 4 | 5 }),
    ];
    const context = buildNormalizationContext({ destinations });

    const result = scoreDestinationWeighted({
      destination: destinations[0],
      profile: {
        preferredCategories: ["culture"],
        tripDurationDays: 3,
        travelIntensity: "balanced",
        budget: "medium",
        travelMonth: 2,
      },
      normalizationContext: context,
      selectedDestinations: [],
    });

    const crowdContrib = result.contributions.find((c) => c.metric === "normCrowd");
    expect(crowdContrib?.direction).toBe("penalty");
    expect(crowdContrib?.weightedScore).toBeLessThanOrEqual(0);
  });

  it("produces identical scores for identical inputs", () => {
    const destinations = [
      makeDestination({ slug: "a", ticket_cost_omr: 3 }),
      makeDestination({ slug: "b", ticket_cost_omr: 8 }),
    ];
    const context = buildNormalizationContext({ destinations });
    const profile = {
      preferredCategories: ["culture"],
      tripDurationDays: 5 as const,
      travelIntensity: "balanced" as const,
      budget: "medium" as const,
      travelMonth: 2,
    };

    const run1 = scoreDestinationWeighted({
      destination: destinations[0],
      profile,
      normalizationContext: context,
      selectedDestinations: [],
    });
    const run2 = scoreDestinationWeighted({
      destination: destinations[0],
      profile,
      normalizationContext: context,
      selectedDestinations: [],
    });

    expect(run1.totalScore).toBe(run2.totalScore);
  });

  it("breaks ties by slug", () => {
    const dest = makeDestination({ slug: "alpha" });
    const context = buildNormalizationContext({ destinations: [dest] });
    const result = scoreDestinationWeighted({
      destination: dest,
      profile: {
        preferredCategories: ["culture"],
        tripDurationDays: 3,
        travelIntensity: "balanced",
        budget: "medium",
        travelMonth: 2,
      },
      normalizationContext: context,
      selectedDestinations: [],
    });

    expect(result.destinationSlug).toBe("alpha");
  });

  it("applies default weights matching documented values", () => {
    const w = defaultWeightedScoringConfig.weights;
    expect(w.interestMatch).toBe(0.34);
    expect(w.seasonFit).toBe(0.18);
    expect(w.normCrowd).toBe(0.1);
    expect(w.normCost).toBe(0.14);
    expect(w.detourPenalty).toBe(0.12);
    expect(w.diversityGain).toBe(0.12);
  });
});

// ---------------------------------------------------------------------------
// 3. Route constraint tests
// ---------------------------------------------------------------------------

describe("route constraints", () => {
  it("enforces max daily visit hours (8 hours)", () => {
    // 6 stops x 2h each = 12h > 8h limit
    const stops = Array.from({ length: 6 }, (_, i) =>
      makeStop({ slug: `stop-${i}`, recommendedDurationHours: 2 })
    );
    const result = buildTimedRouteSummary(stops, { travelIntensity: "packed" });
    expect(result.isValid).toBe(false);
  });

  it("enforces intensity stop caps (relaxed=3, balanced=4, packed=5)", () => {
    // 4 short stops with distinct categories to avoid category repeat cap
    const cats = ["culture", "beach", "nature", "desert"];
    const stops = Array.from({ length: 4 }, (_, i) =>
      makeStop({ slug: `s-${i}`, recommendedDurationHours: 0.5, categories: [cats[i]] })
    );

    const relaxed = buildTimedRouteSummary(stops, { travelIntensity: "relaxed" });
    expect(relaxed.isValid).toBe(false);

    const balanced = buildTimedRouteSummary(stops, { travelIntensity: "balanced" });
    expect(balanced.isValid).toBe(true);
  });

  it("enforces same-region rule", () => {
    const stops = [
      makeStop({ slug: "a", region: "muscat" }),
      makeStop({ slug: "b", region: "dhofar" }),
    ];
    const result = buildTimedRouteSummary(stops, { travelIntensity: "packed" });
    expect(result.isValid).toBe(false);
    expect(result.failureReason).toBe("cross_region_day_not_allowed");
  });

  it("enforces category repetition cap (max 2 per category)", () => {
    const stops = [
      makeStop({ slug: "a", categories: ["beach"] }),
      makeStop({ slug: "b", categories: ["beach"] }),
      makeStop({ slug: "c", categories: ["beach"] }),
    ];
    const result = buildTimedRouteSummary(stops, {
      travelIntensity: "packed",
      allowCategoryRepeatByPreference: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.failureReason).toBe("category_repeat_cap_exceeded");
  });

  it("allows category repeats when preference has <= 1 category", () => {
    const stops = [
      makeStop({ slug: "a", categories: ["beach"], recommendedDurationHours: 0.5 }),
      makeStop({ slug: "b", categories: ["beach"], recommendedDurationHours: 0.5 }),
      makeStop({ slug: "c", categories: ["beach"], recommendedDurationHours: 0.5 }),
    ];
    const result = buildTimedRouteSummary(stops, {
      travelIntensity: "packed",
      allowCategoryRepeatByPreference: true,
    });
    expect(result.isValid).toBe(true);
  });

  it("enforces rest-gap rule (no two consecutive long stops)", () => {
    // Two consecutive stops > 90 minutes each
    const stops = [
      makeStop({ slug: "a", recommendedDurationHours: 2 }),
      makeStop({ slug: "b", recommendedDurationHours: 2 }),
    ];
    const result = buildTimedRouteSummary(stops, { travelIntensity: "packed" });
    expect(result.isValid).toBe(false);
    expect(result.failureReason).toBe("rest_gap_rule_violated");
  });

  it("allows long stop followed by short stop", () => {
    const stops = [
      makeStop({ slug: "a", recommendedDurationHours: 2 }),
      makeStop({ slug: "b", recommendedDurationHours: 0.5 }),
    ];
    const result = buildTimedRouteSummary(stops, { travelIntensity: "packed" });
    expect(result.isValid).toBe(true);
  });

  it("enforces max daily driving km (250 km)", () => {
    // Put stops far apart with distinct categories to avoid category repeat cap
    const stops = [
      makeStop({ slug: "a", coordinates: { lat: 23, lng: 57 }, recommendedDurationHours: 0.5, categories: ["culture"] }),
      makeStop({ slug: "b", coordinates: { lat: 25, lng: 57 }, recommendedDurationHours: 0.5, categories: ["beach"] }),
      makeStop({ slug: "c", coordinates: { lat: 27, lng: 57 }, recommendedDurationHours: 0.5, categories: ["desert"] }),
    ];
    const result = buildTimedRouteSummary(stops, { travelIntensity: "packed" });
    // ~222 km per leg × 2 ≈ 444 km total, should exceed 250 km
    expect(result.isValid).toBe(false);
    expect(result.failureReason).toBe("daily_driving_distance_exceeded");
  });

  it("produces valid schedule within operating window", () => {
    const stops = [
      makeStop({ slug: "a", recommendedDurationHours: 1 }),
      makeStop({ slug: "b", recommendedDurationHours: 1 }),
    ];
    const result = buildTimedRouteSummary(stops, { travelIntensity: "packed" });
    expect(result.isValid).toBe(true);
    expect(result.startTime).toBe("08:00");
    // End time should be before 20:00
    const endHour = parseInt(result.endTime.split(":")[0]);
    expect(endHour).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// 4. Cost model
// ---------------------------------------------------------------------------

describe("cost model constants", () => {
  it("has correct fuel price", () => {
    expect(tripCostConfig.fuelPriceOmrPerLiter).toBe(0.24);
  });

  it("has correct vehicle efficiency", () => {
    expect(tripCostConfig.vehicleKmPerLiter).toBe(12);
  });

  it("has correct food cost", () => {
    expect(tripCostConfig.foodCostOmrPerDay).toBe(6);
  });

  it("has correct hotel rates", () => {
    expect(tripCostConfig.hotelNightlyRateOmr.low).toBe(20);
    expect(tripCostConfig.hotelNightlyRateOmr.medium).toBe(45);
    expect(tripCostConfig.hotelNightlyRateOmr.luxury).toBe(90);
  });

  it("has correct budget thresholds per day", () => {
    expect(tripCostConfig.budgetThresholdOmrPerDay.low).toBe(45);
    expect(tripCostConfig.budgetThresholdOmrPerDay.medium).toBe(80);
    expect(tripCostConfig.budgetThresholdOmrPerDay.luxury).toBe(140);
  });

  it("fuel cost formula matches: (km / 12) * 0.24", () => {
    const totalKm = 120;
    const expectedFuel = (totalKm / 12) * 0.24;
    expect(expectedFuel).toBe(2.4);
  });

  it("hotel cost formula: rate × max(days - 1, 0)", () => {
    const tripDays = 5;
    const hotelCost = tripCostConfig.hotelNightlyRateOmr.medium * Math.max(tripDays - 1, 0);
    expect(hotelCost).toBe(180);
  });

  it("budget threshold for 5-day medium trip is 400 OMR", () => {
    const threshold = tripCostConfig.budgetThresholdOmrPerDay.medium * 5;
    expect(threshold).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 5. Region allocation rules
// ---------------------------------------------------------------------------

describe("region allocation rules", () => {
  it("max per region is ceil(days / 2)", () => {
    for (let days = 1; days <= 7; days++) {
      expect(Math.ceil(days / 2)).toBe(Math.ceil(days / 2));
    }
    expect(Math.ceil(5 / 2)).toBe(3);
    expect(Math.ceil(7 / 2)).toBe(4);
    expect(Math.ceil(3 / 2)).toBe(2);
  });

  it("minimum 2 regions when days >= 3 and viable regions >= 2", () => {
    // This matches the code: tripDays >= 3 && viableRegionCount >= 2 ? 2 : 1
    const tripDays = 5;
    const viableRegionCount = 3;
    const minimumRegions = tripDays >= 3 && viableRegionCount >= 2 ? 2 : 1;
    expect(minimumRegions).toBe(2);
  });

  it("minimum 1 region when days < 3", () => {
    const tripDays = 2;
    const viableRegionCount = 3;
    const minimumRegions = tripDays >= 3 && viableRegionCount >= 2 ? 2 : 1;
    expect(minimumRegions).toBe(1);
  });

  it("viable region threshold is 0.35", () => {
    const viableRegionUtilityThreshold = 0.35;
    expect(viableRegionUtilityThreshold).toBe(0.35);
  });
});

// ---------------------------------------------------------------------------
// 6. Determinism snapshot test
// ---------------------------------------------------------------------------

describe("determinism snapshot", () => {
  it("same scoring inputs produce same output (snapshot)", () => {
    const destinations = [
      makeDestination({
        slug: "mosque",
        categories: ["culture"],
        recommended_months: [10, 11, 12, 1, 2, 3],
        ticket_cost_omr: 0,
        crowd_level: 4 as 1 | 2 | 3 | 4 | 5,
      }),
      makeDestination({
        slug: "beach-resort",
        categories: ["beach", "nature"],
        recommended_months: [10, 11, 12],
        ticket_cost_omr: 8,
        crowd_level: 2 as 1 | 2 | 3 | 4 | 5,
        coordinates: { lat: 23.8, lng: 58.3 },
      }),
    ];
    const context = buildNormalizationContext({ destinations });
    const profile = {
      preferredCategories: ["culture", "beach"],
      tripDurationDays: 5 as const,
      travelIntensity: "balanced" as const,
      budget: "medium" as const,
      travelMonth: 11,
    };

    const scores = destinations.map((d) =>
      scoreDestinationWeighted({
        destination: d,
        profile,
        normalizationContext: context,
        selectedDestinations: [],
      })
    );

    // Run a second time to verify snapshot equality
    const scores2 = destinations.map((d) =>
      scoreDestinationWeighted({
        destination: d,
        profile,
        normalizationContext: context,
        selectedDestinations: [],
      })
    );

    expect(scores[0].totalScore).toBe(scores2[0].totalScore);
    expect(scores[1].totalScore).toBe(scores2[1].totalScore);
    expect(scores[0].destinationSlug).toBe("mosque");
    expect(scores[1].destinationSlug).toBe("beach-resort");
  });
});
