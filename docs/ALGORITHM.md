# Planning Algorithm

## Input

The planner consumes:
- preferred categories
- trip duration in days
- travel intensity
- budget level
- travel month
- saved-interest seed slugs

## Pipeline

### 1. Destination Normalization
Raw dataset entries are normalized into planner-ready destinations with derived region keys, duration hours, and budget bands.

### 2. Candidate Scoring
Each destination receives primitive scores for:
- category match
- season match
- budget match
- crowd preference
- duration fit

Those primitives are normalized across the candidate pool to the `0..1` range before weighted combination. Default weights are configurable and normalized before use.

### 3. Candidate Ranking
Candidates are sorted by total score descending with slug as the deterministic tie-breaker. A target candidate count is derived from trip duration and travel intensity, producing selected, waitlist, and excluded sets.

### 4. Region Allocation
Selected candidates are grouped by governorate, then by destination clusters inside each governorate. Each region receives an allocation weight driven by:
- average match score
- destination density
- diversity bonus

Trip days are distributed with a minimum of one day per allocated region and diminishing returns for additional days so a single high-density region does not monopolize the itinerary.

### 5. Intra-Region Routing
Within each allocated region, candidates are ordered by stable priority and then refined with a nearest-neighbor pass. Stops are distributed across region-days with a minimum-stop guarantee when feasible and an hours-per-day target.

### 6. Itinerary Repair
After the initial itinerary is assembled:
- if total ticket cost exceeds the trip budget target, expensive stops are swapped for cheaper alternatives in the same region with overlapping categories
- if a day is under-utilized, nearby unscheduled attractions from the same region are added

Every repair action is recorded in the final itinerary contract.

## Output

The final contract contains:
- day-by-day itinerary
- stop metadata and totals
- deterministic notes
- repair summary and repair actions
- source contract versions for traceability
