# Planner Algorithm

This document describes the planner pipeline as implemented in the current codebase.

## End-to-End Flow

The planner converts a traveler profile into a final itinerary through six deterministic stages:

1. **Score** every destination using weighted multi-objective primitives.
2. **Rank and select** candidates through greedy iterative scoring.
3. **Allocate** trip days across regions using bounded search with contiguous blocks.
4. **Route** stops inside each region using beam search and 2-opt refinement.
5. **Assemble** the final itinerary with timed schedules.
6. **Repair** the itinerary for budget overruns and underutilized days.

Source: `src/lib/planner/`

## 1. Scoring Primitives

Source: `src/lib/planner/scoring-primitives.ts`

Six normalized primitives score each destination against the traveler profile and the current selection state:

| Primitive | Formula | Range |
| --- | --- | --- |
| `interestMatch` | Jaccard overlap: `\|preferred ∩ destination\| / \|preferred ∪ destination\|` | `[0, 1]` |
| `seasonFit` | `1` if travel month is recommended; otherwise `1 - circularMonthDistance / 6` | `[0, 1]` |
| `normCrowd` | `(crowdLevel - 1) / 4` | `[0, 1]` |
| `normCost` | `(ticketCost - minCost) / (maxCost - minCost)` across dataset | `[0, 1]` |
| `detourPenalty` | `bestInsertionCostKm / (maxPairwiseDistanceKm × 2)` | `[0, 1]` |
| `diversityGain` | fraction of destination categories not yet in the selected set | `[0, 1]` |

All primitives are clamped to `[0, 1]`.

### circularMonthDistance

```
min(|a - b|, 12 - |a - b|)
```

### Insertion cost (detour)

The cheapest cost to insert a destination into the current selected route at any position, computed from Haversine pairwise distances.

## 2. Weighted Scoring Engine

Source: `src/lib/planner/weighted-scoring-engine.ts`

### Scoring formula

```
totalScore =
  + 0.34 × interestMatch
  + 0.18 × seasonFit
  - 0.10 × normCrowd
  - 0.14 × normCost
  - 0.12 × detourPenalty
  + 0.12 × diversityGain
```

Config version: `vo-p3-v1`

### Directions

- **Benefit** (added): `interestMatch`, `seasonFit`, `diversityGain`
- **Penalty** (subtracted): `normCrowd`, `normCost`, `detourPenalty`

### Deterministic rounding

All intermediate and final scores are rounded to 6 decimal places using `Math.round((value + Number.EPSILON) * 1e6) / 1e6`.

### Tie-breaking

Scores are compared numerically; ties are broken by destination slug in lexicographic order.

### Normalization context

Before scoring, the engine computes a global normalization context from all destinations:
- `costRange`: `{ min, max }` of ticket costs
- `maxPairwiseDistanceKm`: maximum Haversine distance between any two destinations

## 3. Candidate Ranking

Source: `src/lib/planner/candidate-ranking.ts`

Config version: `phase-4c-v2`

### Greedy iterative selection

1. Start with all destinations as remaining candidates.
2. Each round: score every remaining candidate against the current selected set using the weighted scoring engine. Sort by `totalScore` descending, then slug ascending.
3. Pick the top candidate, add it to the selected set.
4. Repeat until all destinations are ranked.

### Target candidate count

```
target = clamp(round(tripDays × paceMultiplier), 3, min(10, scored.length))
```

Pace multipliers:
- `relaxed`: `1`
- `balanced`: `1.25`
- `packed`: `1.5`

### Decision classification

- `selected`: rank ≤ target AND totalScore ≥ `0.4`
- `waitlist`: totalScore ≥ `0.4` but rank > target
- `excluded`: totalScore < `0.4`

### Planning context ID

A DJB2 hash of the profile and seed slug inputs, formatted as `ctx_{hex}`.

## 4. Region Allocation

Source: `src/lib/planner/region-allocation.ts`

Config version: `phase-5a-v3`

### Region utility formula

```
regionUtility =
  0.50 × averageCandidateScore
  + 0.20 × destinationDensity
  + 0.20 × regionSeasonFit
  + 0.10 × diversityBonus
```

Where:
- `destinationDensity` = candidate count in region / max candidate count across regions
- `regionSeasonFit` = average `seasonFit` primitive across region candidates
- `diversityBonus` = cluster count / max cluster count across regions

### Allocation constraints

- Trip days clamped to `[1, 7]`
- Maximum days per region: `ceil(tripDays / 2)`
- Minimum regions: `2` if `tripDays ≥ 3` AND viable region count ≥ 2; otherwise `1`
- Viable region threshold: `regionUtility ≥ 0.35`

### Bounded search strategy

For each feasible region count (from minimum to `min(regionCount, tripDays)`):
1. Generate all combinations of regions.
2. Generate all integer compositions (partitions) of trip days into slots of `[1, maxPerRegion]`.
3. Generate all permutations of region ordering.
4. Score each allocation candidate.
5. Select the highest-scoring allocation.

### Allocation score

```
score = weightedUtility
  + coverageBonus × 0.04
  + balanceBonus × 0.03
  - poorSeasonExposure × 0.18
  - transitionPenalty × 0.04
```

Where:
- `weightedUtility` = sum(regionUtility × dayCount) / tripDays
- `poorSeasonExposure` = sum(max(0, 0.45 - regionSeasonFit) × dayCount) / tripDays
- `transitionPenalty` = sum(|utility[i-1] - utility[i]|) / (regionCount - 1)
- `coverageBonus` = (regionCount - 1) / max(1, min(tripDays, availableRegionCount) - 1)
- `balanceBonus` = 1 - (maxAllocatedDays - 1) / max(1, tripDays - 1)

### Contiguous blocks

The output is a sequence of contiguous day blocks. Each region occupies a continuous range of days (e.g., Region A: days 1–3, Region B: days 4–5).

### Fallback

If no valid allocation is found, all trip days go to the single highest-utility region.

## 5. Intra-Region Routing

Source: `src/lib/planner/intra-region-routing.ts`

Config version: `phase-5b-v3`

### Constants

| Parameter | Value |
| --- | --- |
| Beam width | `4` |
| Travel speed | `55 km/h` |
| Day window | `08:00`–`20:00` |
| Max daily driving | `250 km` |
| Max daily visit time | `480 minutes` (8 hours) |
| Min visit duration | `30 minutes` |
| Long stop threshold | `> 90 minutes` |
| Stop cap (relaxed) | `3` |
| Stop cap (balanced) | `4` |
| Stop cap (packed) | `5` |
| Category repeat cap | `2` per category per day |

### Hard constraints (route validation)

Every route expansion and 2-opt swap is validated against all of these:

1. **Same-region rule**: all stops in a day must be in the same region.
2. **Stop cap**: stops per day ≤ intensity cap.
3. **Category repetition**: no category appears more than 2 times per day. Exception: skipped when the profile has ≤ 1 preferred category.
4. **Rest-gap rule**: two consecutive long stops (> 90 min) are rejected.
5. **Max daily driving**: total travel ≤ 250 km.
6. **Max daily visit time**: total visit time ≤ 480 minutes.
7. **Operating window**: all stops must finish before 20:00.

### Beam search

- Candidates are priority-sorted by rank (ascending), score (descending), duration (ascending), original index, and slug.
- At each depth, expand all beam states by trying every unvisited candidate. Only keep expansions where `evaluateRoute()` returns valid.
- Deduplicate by route signature (slug sequence).
- Retain top 4 states by: longer route > higher total score > lower distance > lexicographic signature.

### 2-opt refinement

Applied only when route has > 3 stops. For each pair of positions, reverse the sub-segment. Accept only if valid AND distance improves by > 1e-9. Repeat until no improvement.

### Day planning

For each allocated region day:
1. Compute `reserveForFutureDays = min(remainingCandidates - 1, remainingDaysAfterCurrent)`.
2. `maxSelectableStops = min(intensityCap, remainingCandidates - reserveForFutureDays)`.
3. Run beam search, then 2-opt.
4. If valid, consume those candidates and advance.

### Travel time

```
travelMinutes = max(5, round((distanceKm / 55) × 60))
```

Returns 0 if distance ≤ 0.

### Distance metric

Haversine great-circle distance using Earth radius = 6371 km, computed through a symmetric N×N distance matrix.

## 6. Itinerary Assembly

Source: `src/lib/planner/final-itinerary.ts`

Version: `phase-5c-v2`

1. Build candidate and destination maps from selected + waitlist candidates.
2. For each day plan: create `ItineraryStop` objects enriched with name, description, region, times, visit duration, travel metrics, ticket cost, crowd level, rank, score, reason codes, and score breakdown.
3. Run `repairGeneratedItinerary()` on the initial days.
4. Compute totals: day count, stop count, unresolved days, visit hours, travel km.

## 7. Itinerary Repair

Source: `src/lib/planner/itinerary-repair.ts`

### Phase A: Budget repair

**Trigger**: `totalCostOmr > budgetThresholdOmrPerDay[budgetLevel] × tripDays`

Budget thresholds per day:
- `low`: 45 OMR
- `medium`: 80 OMR
- `luxury`: 140 OMR

**Loop** (while over budget):
1. Rank scheduled stops by repair priority: lowest value-for-cost first (`score / ticketCost`), then higher cost, then higher travel distance, then day index, stop index, slug.
2. For each candidate stop to replace: find same-region alternatives with strictly lower ticket cost that preserve category coverage.
3. Sort alternatives: free first, then lowest cost, then highest category overlap, then lowest detour, then highest score, then slug.
4. Apply swap. Re-evaluate the day's route. If the day becomes invalid, revert and try next.
5. Recalculate trip cost. Continue until within budget or no replacements remain.

### Phase B: Underutilized day fill

**Trigger per day**: `estimatedVisitHours < 8 × 0.6 = 4.8 hours`

1. Find same-region unscheduled candidates, sorted by: closest distance, then highest score, then lowest cost, then slug.
2. Project addition: must not exceed budget threshold.
3. Add if route remains valid.

## 8. Cost Model

Source: `src/lib/planner/cost-model.ts`

### Constants

| Item | Value |
| --- | --- |
| Fuel price | 0.24 OMR/liter |
| Vehicle efficiency | 12 km/liter |
| Food | 6 OMR/day |
| Hotel (low) | 20 OMR/night |
| Hotel (medium) | 45 OMR/night |
| Hotel (luxury) | 90 OMR/night |
| Budget threshold/day (low) | 45 OMR |
| Budget threshold/day (medium) | 80 OMR |
| Budget threshold/day (luxury) | 140 OMR |

### Formulas

```
fuel     = (totalKm / 12) × 0.24
food     = 6 × tripDays
hotel    = nightlyRate[budget] × max(tripDays - 1, 0)
tickets  = sum(stop.ticketCostOmr)
total    = fuel + food + hotel + tickets
```

### Budget check

```
threshold    = budgetThresholdPerDay[budget] × tripDays
withinBudget = total ≤ threshold
```

## Why This Design Fits The Brief

- **Deterministic**: fixed weights, fixed beam width, fixed speed, stable slug tie-breakers, no randomness, no external APIs.
- **Local-only**: all scoring, routing, and costing run in the browser from the bundled dataset.
- **Explainable**: every ranked stop carries weighted scoring reasons; the result page surfaces top contributors and tradeoff labels.
- **Stronger than greedy**: beam search with 2-opt refinement produces better routes than nearest-neighbor while staying bounded.
- **Region-aware**: bounded search over region combinations with season awareness, contiguous blocks, and min/max constraints.
- **Budget-aware**: full-trip cost threshold repair with category-preserving replacements.
