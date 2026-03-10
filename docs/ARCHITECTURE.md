# Architecture Overview

## Goals

The codebase is organized to keep the travel experience simple at the UI layer and deterministic in the planner layer. Data is local, planner behavior is reproducible, and browser persistence is isolated from the pure planning pipeline.

## Codebase Structure

### App routes

- `src/app/[locale]/page.tsx`: landing page
- `src/app/[locale]/discover/*`: destination discovery flow
- `src/app/[locale]/planner/page.tsx`: traveler input form
- `src/app/[locale]/planner/result/page.tsx`: final traveler-facing itinerary
- `src/app/[locale]/saved/page.tsx`: saved-interest view

### Shared UI

- `src/components/site-header.tsx`: shared navigation and locale switch
- `src/components/planner-form.tsx`: planner input controls
- `src/components/save-interest-button.tsx`: save/unsave interaction
- `src/components/saved-interests-panel.tsx`: saved state summary

### Data and domain shaping

- `src/data/challenge-dataset.ts`: source dataset bundled in-repo
- `src/lib/data/load-destinations.ts`: dataset version + loading
- `src/lib/data/normalize-destinations.ts`: domain normalization for planner use
- `src/types/dataset.ts`: raw dataset contracts
- `src/types/domain.ts`: normalized domain contracts

### Planner pipeline

- `src/lib/planner/scoring-primitives.ts`: primitive scoring signals
- `src/lib/planner/weighted-scoring-engine.ts`: normalized weighted ranking
- `src/lib/planner/candidate-ranking.ts`: selected/waitlist handoff
- `src/lib/planner/region-allocation.ts`: deterministic day allocation across regions
- `src/lib/planner/intra-region-routing.ts`: beam search, 2-opt, timed day plans
- `src/lib/planner/final-itinerary.ts`: final assembly for UI consumption
- `src/lib/planner/itinerary-repair.ts`: deterministic budget/day-fill repair

### Persistence and i18n

- `src/lib/persistence/*`: localStorage wrappers for planner draft, saved interests, and itinerary
- `src/lib/i18n/*`: locale resolution, message dictionaries, and formatting helpers

## Data Flow

1. The page loads the static dataset and resolves locale-specific labels.
2. Destinations are normalized into planner-ready objects with region keys, budget level, and hour estimates.
3. Candidate ranking scores every destination against the traveler profile.
4. Region allocation decides how many days each region receives.
5. Intra-region routing orders stops, splits them into days, and assigns timestamps.
6. Final itinerary assembly enriches routed stops with UI-facing metadata like descriptions, costs, and crowd level.
7. Repair runs last to swap expensive stops or fill underused days without introducing nondeterminism.
8. The result page renders itinerary cards and persists the output locally.

## SSR vs CSR Boundaries

### SSR-friendly pieces

- App Router shell and locale-aware route structure
- Static dataset loading
- Shared layout and navigation composition

### CSR-only pieces

- Planner form draft persistence
- Saved interests
- Final itinerary persistence
- Result-page itinerary generation triggered from browser state

The result page is intentionally a client page because it depends on browser-stored traveler preferences and saved interests. The planner logic itself remains framework-agnostic and can be moved server-side later if a persistent backend is added.

## Determinism Boundaries

Determinism is preserved by:

- stable slug-based tie breaking
- fixed beam width and travel-speed assumptions
- local static data instead of remote APIs
- explicit ordering before allocation, routing, and repair

Non-deterministic browser concerns such as `savedAt` timestamps are isolated to persistence metadata and do not affect the planner output itself.
