# Visit Oman Frontend

Judge-facing submission document for the CodeStacker 2026 Visit Oman frontend challenge.

## Project Overview

Visit Oman is a bilingual Next.js App Router experience that turns a fixed Oman destination dataset into an end-to-end traveler journey:

1. SSR discovery and destination detail browsing
2. saved-interest collection in the browser
3. CSR planner input using those saved interests as defaults
4. deterministic itinerary generation with route, timing, reasoning, and cost output

The app ships with `challenge-dataset.v3`, uses 25 in-repo destinations only, and keeps the planner deterministic for identical inputs.

## Why This Solves The Challenge

This submission is built around the challenge rubric rather than generic travel UI:

- Discovery is server-rendered and crawlable.
- Planning consumes only the provided static dataset.
- Saved interests bridge discovery into planning without re-entry.
- The planner is explainable: every ranked stop carries weighted scoring reasons.
- Region coverage, route ordering, timing, and budget handling are explicit and deterministic.
- The result page is traveler-facing, not a debug dump: daily stops, times, cost totals, map, and rationale are surfaced directly.

## Product Journey

### 1. SSR discovery

- `src/app/[locale]/page.tsx`
- `src/app/[locale]/discover/page.tsx`
- `src/app/[locale]/discover/[slug]/page.tsx`

These pages load the bundled dataset on the server, normalize labels per locale, and render featured regions, category spotlights, discovery filters, and detailed destination pages.

### 2. Saved interests

- `src/lib/persistence/interests.ts`
- `src/app/[locale]/saved/page.tsx`

Users can save destinations during discovery. The saved slug list is stored in `localStorage` under `visit-oman.interests.v1`.

### 3. CSR planner

- `src/app/[locale]/planner/page.tsx`
- `src/components/planner-form.tsx`

The planner form runs client-side because it depends on browser state. Saved interests and draft inputs prefill the planner, which captures:

- preferred categories
- trip duration: `1..7` days
- travel intensity: `relaxed | balanced | packed`
- budget: `low | medium | luxury`
- travel month: `1..12`

### 4. CSR result

- `src/app/[locale]/planner/result/page.tsx`

The result page reads the planner draft and saved interests, runs the full planner pipeline in the browser, persists the itinerary, computes cost breakdowns, and renders the final plan plus a client-only Leaflet map.

## Architecture

### App shell and UI

- `src/app/[locale]/*`: route composition
- `src/components/*`: planner form, saved state UI, site header, map shell

### Data layer

- `src/data/challenge-dataset.ts`: source of truth
- `src/lib/data/load-destinations.ts`: dataset loading and versioning
- `src/lib/data/normalize-destinations.ts`: locale-aware domain shaping
- `src/lib/data/selectors.ts`: SSR discovery selectors

### Planner pipeline

- `src/lib/planner/candidate-ranking.ts`
- `src/lib/planner/scoring-primitives.ts`
- `src/lib/planner/weighted-scoring-engine.ts`
- `src/lib/planner/region-allocation.ts`
- `src/lib/planner/intra-region-routing.ts`
- `src/lib/planner/final-itinerary.ts`
- `src/lib/planner/itinerary-repair.ts`
- `src/lib/planner/cost-model.ts`

### Persistence and i18n

- `src/lib/persistence/*`
- `src/lib/i18n/*`

## Rendering Boundaries

### SSR

- `/[locale]`
- `/[locale]/discover`
- `/[locale]/discover/[slug]`

These routes are ideal for first-load performance, crawlability, and static dataset rendering.

### CSR

- `/[locale]/planner`
- `/[locale]/planner/result`
- `/[locale]/saved`

These routes depend on `localStorage` and traveler-specific state. The map is dynamically imported with `ssr: false`.

## Dataset Handling

The application does not call external content APIs. All destination content comes from `src/data/challenge-dataset.ts`.

- Dataset version: `challenge-dataset.v3`
- Destination count: `25`
- Source contract: `src/types/dataset.ts`
- Normalized planner contract: `src/types/domain.ts`

Normalization adds:

- `coordinates`
- `description`
- `budgetLevel`
- `recommendedDurationHours`
- `regionKey`
- `regionLabel`
- `locale`

This keeps discovery and planner code reading a single normalized shape instead of mutating raw records ad hoc.

## Exact Scoring Formula

Weighted scoring is defined in `src/lib/planner/weighted-scoring-engine.ts`.

For each destination:

```text
totalScore =
  + 0.34 * interestMatch
  + 0.18 * seasonFit
  - 0.10 * normCrowd
  - 0.14 * normCost
  - 0.12 * detourPenalty
  + 0.12 * diversityGain
```

Primitive definitions from `src/lib/planner/scoring-primitives.ts`:

- `interestMatch`: Jaccard overlap between destination categories and preferred categories.
- `seasonFit`: `1` when the travel month is recommended, otherwise `1 - circularMonthDistance / 6`.
- `normCrowd`: `(crowdLevel - 1) / 4`, clamped to `[0, 1]`.
- `normCost`: ticket cost normalized across dataset min/max.
- `detourPenalty`: best insertion-cost distance divided by `maxPairwiseDistanceKm * 2`.
- `diversityGain`: fraction of the destination's categories not yet represented in the selected set.

Scoring details:

- Precision is rounded deterministically to 6 digits.
- Penalty metrics are subtracted, not added.
- Stable tie-breaker is destination slug.
- Config version: `vo-p3-v1`

Candidate selection in `src/lib/planner/candidate-ranking.ts` then applies:

- minimum viable score: `0.4`
- target candidate count:

```text
round(tripDays * paceMultiplier), clamped to [3, 10]
```

- pace multipliers:
  - `relaxed = 1`
  - `balanced = 1.25`
  - `packed = 1.5`

## Region Allocation Strategy

Region allocation is implemented in `src/lib/planner/region-allocation.ts`.

For each region:

```text
allocationWeight =
  0.50 * averageCandidateScore
  + 0.35 * destinationDensity
  + 0.15 * diversityBonus
```

Where:

- `averageCandidateScore` = mean score of selected candidates in the region
- `destinationDensity` = candidate count in region / max region candidate count
- `diversityBonus` = `1 / clusterCount`

Clusters are formed deterministically from ranked match signatures. Allocation works in two passes:

1. Give one baseline day to the strongest `min(tripDays, regionCount)` regions.
2. Distribute remaining days using diminishing returns:

```text
marginalGain = allocationWeight / (currentAllocatedDays + 1)
```

The final day sequence is interleaved round-robin style so one region does not consume all early days unless it truly dominates.

## Beam Search + 2-Opt Routing

Intra-region routing is implemented in `src/lib/planner/intra-region-routing.ts`.

### Beam search

- distance metric: local Haversine matrix
- beam width: `4`
- travel speed assumption: `55 km/h`
- comparison order: lower cumulative distance, then slug signature

The beam search is bounded, deterministic, and stronger than naive nearest-neighbor because it keeps multiple partial route candidates alive before committing to a full order.

### 2-opt refinement

Once beam search outputs an ordered route, 2-opt reversals are applied until no shorter route remains. This reduces crossing and extra backtracking within the open route.

## Route Constraints

Daily scheduling enforces explicit constraints:

- day window: `08:00` to `20:00`
- minimum visit duration: `30` minutes
- soft planning target: `8` hours per day
- hard stop: do not exceed the operating window
- preserve at least one stop for remaining days when feasible
- if a stop only partially fits, the visit duration is trimmed and marked in notes

This produces scheduled stops with:

- start time
- end time
- travel minutes from previous stop
- estimated visit hours

## Cost Model

Trip costing is implemented in `src/lib/planner/cost-model.ts`.

Constants:

- fuel price: `0.24 OMR / liter`
- vehicle efficiency: `12 km / liter`
- food: `6 OMR / day`
- hotel per night:
  - `low = 20 OMR`
  - `medium = 45 OMR`
  - `luxury = 90 OMR`
- budget threshold per day:
  - `low = 45 OMR`
  - `medium = 80 OMR`
  - `luxury = 140 OMR`

Computed totals:

```text
fuel = (totalKm / 12) * 0.24
food = 6 * tripDays
hotel = nightlyRate(budgetTier) * max(tripDays - 1, 0)
tickets = sum(stop.ticketCostOmr)
total = fuel + food + hotel + tickets
```

The result page persists both itinerary and derived cost breakdown, and also marks whether the trip is within the budget threshold.

## Budget Repair

Repair happens in `src/lib/planner/itinerary-repair.ts` after the first itinerary assembly.

### Budget swap

If total ticket cost exceeds the planner target:

```text
budgetTarget = budgetLevelToTargetCost(budget) * tripDays
```

Where `budgetLevelToTargetCost` is:

- `low = 5`
- `medium = 15`
- `luxury = 30`

The repair loop swaps an expensive stop for a cheaper unscheduled stop in the same region with overlapping categories, preferring:

1. larger savings
2. stronger category overlap
3. higher candidate score
4. slug tie-break

### Underutilized-day fill

If a day stays below `60%` of the hours-per-day target, the planner adds the nearest unscheduled same-region stop, then prefers higher score and lower price on ties.

Every repair action is captured in the final itinerary summary.

## Persistence

Browser persistence is versioned and isolated under `src/lib/persistence/*`.

Keys:

- `visit-oman.locale.v1`
- `visit-oman.interests.v1`
- `visit-oman.planner-draft.v1`
- `visit-oman.itinerary.v1`
- `visit-oman.cost-breakdown.v1`

Persisted behavior:

- saved interests survive refresh
- planner draft survives refresh
- result page rehydrates the last itinerary
- legacy cost payloads migrate into schema version `2`

## Accessibility And Bilingual Support

The app supports English and Arabic from the same product flow.

- locale routes: `/en/*` and `/ar/*`
- localized labels and messages: `src/lib/i18n/messages/*`
- locale resolution: `src/lib/i18n/config.ts`
- discovery, planner, saved view, and result page all render in both languages
- discovery filters and result explanations use translated labels, month names, budget labels, and category labels

The UI also uses standard semantic controls such as links, buttons, labels, and select inputs, and the result view exposes route tabs and map interactions through regular focusable controls.

## Performance And Determinism

Performance choices:

- all destination content is local
- SSR is used where search engines and first paint matter
- planner logic is pure TypeScript modules
- the map is client-only and excluded from SSR

Determinism choices:

- fixed weights
- fixed beam width
- fixed travel-speed assumption
- stable slug tie-breakers
- no remote ranking APIs
- no randomization

The only non-deterministic values are persistence timestamps such as `savedAt`; they do not affect itinerary generation.

## Tests

There is currently no committed automated unit or e2e test suite in this repository.

Current verification is build-oriented:

- `npm run build`

`next build` is the authoritative verification command in this repo because `tsconfig.json` includes generated `.next/types/**` entries that are produced and checked inside Next's build pipeline.

Given the planner is deterministic and implemented as pure functions, the next strongest improvement would be direct unit coverage for scoring, allocation, routing, and repair.

## Run Instructions

```bash
npm install
npm run dev
```

Open `http://localhost:3000/en` or `http://localhost:3000/ar`.

## Verification Commands

```bash
npm run build
```

Recommended manual smoke flow:

```bash
npm run dev
```

Then verify:

1. `/en/discover` filters destinations server-side.
2. save a few destinations.
3. `/en/planner` opens with persisted defaults.
4. `/en/planner/result` shows a generated itinerary, costs, and map.
5. refresh the result page and confirm persistence.
6. repeat on `/ar`.

## Tradeoffs

- Planner generation is client-side to preserve local saved-state continuity; this improves UX but means the result page is not server-rendered.
- Distance uses Haversine instead of road routing APIs; this keeps the app offline and deterministic, but road travel will differ from real driving paths.
- Budget repair prioritizes fast deterministic swaps over global optimality.
- No automated test suite is committed yet; verification currently relies on the Next production build and manual flow checks.

## Screenshots

The repository does not currently include image assets, but these are the exact screenshots judges should see:

1. Home hero and SSR discovery entry: `/en`
2. Discovery filters and cards: `/en/discover`
3. Destination detail with save action: `/en/discover/muttrah-corniche`
4. Saved interests bridge: `/en/saved`
5. Planner form with persisted inputs: `/en/planner`
6. Result overview with map and cost cards: `/en/planner/result`
7. Arabic planner result parity: `/ar/planner/result`

Suggested filenames:

- `screenshots/home-en.png`
- `screenshots/discovery-en.png`
- `screenshots/detail-en.png`
- `screenshots/saved-en.png`
- `screenshots/planner-en.png`
- `screenshots/result-en.png`
- `screenshots/result-ar.png`
