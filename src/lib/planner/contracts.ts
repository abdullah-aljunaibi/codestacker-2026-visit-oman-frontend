import type { Destination, InterestProfile, ItineraryPlan } from "@/types/domain";

export interface PlannerContext {
  datasetVersion: string;
  destinations: Destination[];
}

export interface PlannerEngine {
  generate(profile: InterestProfile, context: PlannerContext): ItineraryPlan;
}
