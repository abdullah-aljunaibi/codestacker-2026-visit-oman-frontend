import { challengeDataset, challengeDatasetVersion } from "@/data/challenge-dataset";
import type { DatasetDestination } from "@/types/dataset";

export function loadDestinations(): DatasetDestination[] {
  return challengeDataset;
}

export function loadDestinationsWithVersion() {
  return {
    datasetVersion: challengeDatasetVersion,
    destinations: loadDestinations()
  };
}
