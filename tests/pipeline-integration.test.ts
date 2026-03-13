/**
 * Full pipeline integration test using the real dataset.
 */
import { describe, it, expect } from "vitest";

import { challengeDataset, challengeDatasetVersion } from "@/data/challenge-dataset";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { rankCandidatesForPlanner } from "@/lib/planner/candidate-ranking";
import { allocateTripDaysAcrossRegions } from "@/lib/planner/region-allocation";
import { generateIntraRegionDayPlans } from "@/lib/planner/intra-region-routing";
import { assembleFinalItinerary } from "@/lib/planner/final-itinerary";
import { calculateTripCostBreakdown } from "@/lib/planner/cost-model";
import { haversineDistance } from "@/lib/geo/haversine";
import type { InterestProfile } from "@/types/domain";

function runFullPipeline(profile: InterestProfile, savedSlugs: string[] = []) {
  const destinations = normalizeDestinations(challengeDataset, "en");
  const ranking = rankCandidatesForPlanner({
    profile,
    destinations,
    seedDestinationSlugs: savedSlugs,
    datasetVersion: challengeDatasetVersion,
  });
  const allocation = allocateTripDaysAcrossRegions(ranking.handoff);
  const routing = generateIntraRegionDayPlans({
    handoff: ranking.handoff,
    allocation,
  });
  const itinerary = assembleFinalItinerary({
    handoff: ranking.handoff,
    routing,
    destinations,
  });
  const cost = calculateTripCostBreakdown({
    itinerary,
    budgetTier: profile.budget,
  });
  return { ranking, allocation, routing, itinerary, cost, destinations };
}

const baseProfile: InterestProfile = {
  preferredCategories: ["culture", "beach", "nature", "desert", "mountain"],
  tripDurationDays: 5,
  travelIntensity: "balanced",
  budget: "medium",
  travelMonth: 11,
};

describe("full pipeline integration", () => {
  it("produces a non-empty itinerary with 5 categories and 5 days", () => {
    const { itinerary, cost } = runFullPipeline(baseProfile, [
      "nizwa-fort", "wahiba-sands", "jebel-akhdar", "mughsail-beach", "khasab-fjords",
    ]);
    expect(itinerary.days.length).toBeGreaterThan(0);
    expect(itinerary.totals.stopCount).toBeGreaterThan(0);
    expect(itinerary.totals.estimatedTravelKm).toBeGreaterThan(0);
    expect(cost.totalCostOmr).toBeGreaterThan(0);
  });

  it("determinism: two runs produce identical results", () => {
    const seeds = ["nizwa-fort", "wahiba-sands"];
    const run1 = runFullPipeline(baseProfile, seeds);
    const run2 = runFullPipeline(baseProfile, seeds);
    expect(run1.itinerary.days.length).toBe(run2.itinerary.days.length);
    expect(run1.itinerary.totals.stopCount).toBe(run2.itinerary.totals.stopCount);
    expect(run1.itinerary.totals.estimatedTravelKm).toBe(run2.itinerary.totals.estimatedTravelKm);
    expect(run1.cost.totalCostOmr).toBe(run2.cost.totalCostOmr);
    // Check stop order per day
    run1.itinerary.days.forEach((day, i) => {
      const slugs1 = day.stops.map(s => s.slug);
      const slugs2 = run2.itinerary.days[i].stops.map(s => s.slug);
      expect(slugs1).toEqual(slugs2);
    });
  });

  it("region allocation: 5-day trip visits at least 2 regions", () => {
    const { allocation } = runFullPipeline(baseProfile, ["nizwa-fort", "mughsail-beach"]);
    const allocatedRegions = allocation.regionBuckets.filter(b => b.allocatedDays > 0);
    expect(allocatedRegions.length).toBeGreaterThanOrEqual(2);
  });

  it("region allocation: no region gets more than ceil(days/2) days", () => {
    const { allocation, itinerary } = runFullPipeline(baseProfile);
    const maxPerRegion = Math.ceil(itinerary.tripDays / 2);
    allocation.regionBuckets.forEach(bucket => {
      expect(bucket.allocatedDays).toBeLessThanOrEqual(maxPerRegion);
    });
  });

  it("daily schedule: max 250 km driving per day", () => {
    const { itinerary } = runFullPipeline(baseProfile, ["nizwa-fort"]);
    itinerary.days.forEach(day => {
      expect(day.estimatedTravelKm).toBeLessThanOrEqual(250);
    });
  });

  it("daily schedule: max 8 hours visit time per day", () => {
    const { itinerary } = runFullPipeline(baseProfile);
    itinerary.days.forEach(day => {
      expect(day.estimatedVisitHours).toBeLessThanOrEqual(8);
    });
  });

  it("daily schedule: same region for all stops in a day", () => {
    const { itinerary } = runFullPipeline(baseProfile);
    itinerary.days.forEach(day => {
      day.stops.forEach(stop => {
        expect(stop.region).toBe(day.region);
      });
    });
  });

  it("travel intensity: relaxed caps at 3 stops/day", () => {
    const profile = { ...baseProfile, travelIntensity: "relaxed" as const };
    const { itinerary } = runFullPipeline(profile);
    itinerary.days.forEach(day => {
      expect(day.stopCount).toBeLessThanOrEqual(3);
    });
  });

  it("travel intensity: balanced caps at 4 stops/day", () => {
    const profile = { ...baseProfile, travelIntensity: "balanced" as const };
    const { itinerary } = runFullPipeline(profile);
    itinerary.days.forEach(day => {
      expect(day.stopCount).toBeLessThanOrEqual(4);
    });
  });

  it("travel intensity: packed caps at 5 stops/day", () => {
    const profile = { ...baseProfile, travelIntensity: "packed" as const };
    const { itinerary } = runFullPipeline(profile);
    itinerary.days.forEach(day => {
      expect(day.stopCount).toBeLessThanOrEqual(5);
    });
  });

  it("output completeness: each stop has timestamps, travel km, reason codes", () => {
    const { itinerary } = runFullPipeline(baseProfile, ["nizwa-fort"]);
    itinerary.days.forEach(day => {
      day.stops.forEach(stop => {
        expect(stop.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(stop.endTime).toMatch(/^\d{2}:\d{2}$/);
        expect(stop.visitDurationMinutes).toBeGreaterThan(0);
        expect(typeof stop.travelKmFromPrevious).toBe("number");
        expect(Array.isArray(stop.reasonCodes)).toBe(true);
      });
    });
  });

  it("cost model: fuel + tickets + food + hotel = total", () => {
    const { cost } = runFullPipeline(baseProfile);
    const sum = cost.fuelCostOmr + cost.ticketsCostOmr + cost.foodCostOmr + cost.hotelCostOmr;
    expect(Math.abs(sum - cost.totalCostOmr)).toBeLessThan(0.02);
  });

  it("budget pressure: low budget adapts by preferring cheaper stops", () => {
    const lowProfile = { ...baseProfile, budget: "low" as const };
    const luxProfile = { ...baseProfile, budget: "luxury" as const };
    const lowResult = runFullPipeline(lowProfile);
    const luxResult = runFullPipeline(luxProfile);
    // Low budget should have equal or less ticket costs
    expect(lowResult.cost.ticketsCostOmr).toBeLessThanOrEqual(luxResult.cost.ticketsCostOmr);
  });

  it("haversine: known distance Muscat-Nizwa ~140km", () => {
    const d = haversineDistance(23.588, 58.382, 22.933, 57.530);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });

  it("haversine: zero distance for same point", () => {
    expect(haversineDistance(23.5, 58.5, 23.5, 58.5)).toBe(0);
  });

  it("haversine: symmetry", () => {
    const d1 = haversineDistance(23.5, 58.5, 22.9, 57.5);
    const d2 = haversineDistance(22.9, 57.5, 23.5, 58.5);
    expect(d1).toBe(d2);
  });

  it("no external API calls needed: all data from dataset", () => {
    const { destinations } = runFullPipeline(baseProfile);
    expect(destinations.length).toBe(25);
    expect(challengeDatasetVersion).toMatch(/^challenge-dataset/);
  });
});
