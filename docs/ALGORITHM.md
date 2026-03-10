# Planner Algorithm

## End-to-End Flow

The planner converts a traveler profile into a final itinerary through five deterministic stages:

1. score destinations
2. choose selected and waitlist candidates
3. allocate trip days across regions
4. route stops inside each region
5. repair the itinerary for budget and underused days

## Scoring Model

Weighted ranking combines five normalized signals:

- category match
- season match
- budget match
- crowd preference
- duration fit

Each destination receives primitive scores first, then normalized weighted contributions. Stable sorting is applied by total score and slug, so identical inputs produce the same ranked order.

## Region Allocation

Selected candidates are grouped by region. Each region receives an allocation weight based on:

- average candidate score
- destination density inside the candidate pool
- a diversity bonus derived from clustered match signatures

Trip days are distributed across regions deterministically, then expanded into a day-by-day region sequence.

## Intra-Region Routing

### Beam search

Inside a region, candidate stops are first priority-sorted, then routed with bounded beam search.

- beam width: `4`
- distance metric: haversine distance matrix
- tie breaking: route signature by slug order

The beam keeps only the best partial routes by cumulative travel distance. This improves on plain nearest-neighbor while staying bounded and deterministic.

### 2-opt refinement

After beam search produces a full candidate order, 2-opt local optimization is applied to reduce path crossings and shorten the open route further. Improvements are accepted deterministically until no better reversal remains.

## Daily Planning

The region route is split into day plans using two constraints:

- soft target from region allocation hours-per-day
- hard operating window from `08:00` to `20:00`

Routing also estimates inter-stop travel time from haversine distance and a fixed average overland speed. Every day keeps at least one remaining stop when feasible so later days do not become empty by accident.

Each planned stop receives:

- start time
- end time
- travel minutes from the previous stop
- scheduled visit duration

## Repair

Repair is intentionally deterministic and limited in scope.

### Budget repair

If the planned itinerary exceeds the trip budget target, the repair step looks for cheaper same-region replacements with overlapping categories.

### Underutilized day fill

If a day remains too light, the repair step adds the nearest unscheduled stop from the same region, preferring short-distance additions and stronger scores.

## Why This Fits The Challenge

The algorithm balances explainability, predictability, and decent route quality:

- score-based selection stays interpretable
- allocation preserves regional variety
- beam search plus 2-opt improves route quality without introducing external dependencies
- repair keeps the itinerary usable when budget or day utilization drift
