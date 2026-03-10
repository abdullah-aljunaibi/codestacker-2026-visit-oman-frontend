import { challengeDataset, challengeDatasetVersion } from "@/data/challenge-dataset";

export function loadDestinations() {
  return challengeDataset;
}

export function loadDestinationsWithVersion() {
  return {
    datasetVersion: challengeDatasetVersion,
    destinations: loadDestinations()
  };
}
