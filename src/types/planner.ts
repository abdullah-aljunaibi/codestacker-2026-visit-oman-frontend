import type { DatasetDestination } from "@/types/dataset";
import type {
  InterestProfile,
  ItineraryPlan,
} from "@/types/domain";

export type { InterestProfile, ItineraryDay, PlannerExplanation, ItineraryPlan } from "@/types/domain";

export interface PlannerContext {
  datasetVersion: string;
  destinations: DatasetDestination[];
}

export interface PlannerEngine {
  generate(profile: InterestProfile, context: PlannerContext): ItineraryPlan;
}
