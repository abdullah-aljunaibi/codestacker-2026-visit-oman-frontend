/**
 * Produces a deterministic nearest-neighbor traversal over a distance matrix.
 *
 * Starting from `startIndex`, each step chooses the closest unvisited node.
 * Equal distances fall back to the lowest index so the output is stable.
 */
export function nearestNeighborOrder(distanceMatrix: number[][], startIndex: number): number[] {
  if (distanceMatrix.length === 0) {
    return [];
  }

  const clampedStartIndex = Math.max(0, Math.min(startIndex, distanceMatrix.length - 1));
  const visited = new Array(distanceMatrix.length).fill(false);
  const order = [clampedStartIndex];
  visited[clampedStartIndex] = true;

  while (order.length < distanceMatrix.length) {
    const currentIndex = order[order.length - 1];
    let nextIndex = -1;
    let nextDistance = Number.POSITIVE_INFINITY;

    for (let candidateIndex = 0; candidateIndex < distanceMatrix.length; candidateIndex += 1) {
      if (visited[candidateIndex] || candidateIndex === currentIndex) {
        continue;
      }

      const candidateDistance = distanceMatrix[currentIndex][candidateIndex];
      if (candidateDistance < nextDistance || (candidateDistance === nextDistance && candidateIndex < nextIndex)) {
        nextDistance = candidateDistance;
        nextIndex = candidateIndex;
      }
    }

    if (nextIndex === -1) {
      break;
    }

    visited[nextIndex] = true;
    order.push(nextIndex);
  }

  return order;
}
