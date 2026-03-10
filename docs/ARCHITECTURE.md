# Architecture

## Overview

The application is a localized travel-discovery and planning frontend built on Next.js App Router. Static destination data is loaded locally, normalized into planner-friendly domain objects, and consumed by both SSR discovery pages and CSR planner workflows.

## Major Areas

### App Layer
- `src/app/[locale]/...` hosts the localized routes.
- Marketing, discovery, and destination detail pages are server-rendered.
- Saved-interest and planner flows use client components because they depend on browser persistence.

### Domain And Data Layer
- `src/data/challenge-dataset.ts` stores the challenge dataset.
- `src/lib/data/load-destinations.ts` loads the dataset with version metadata.
- `src/lib/data/normalize-destinations.ts` converts dataset records into `Destination` objects with planner-specific fields such as `budgetLevel`, `recommendedDurationHours`, and `regionKey`.

### Planner Layer
- `src/lib/planner/weighted-scoring-engine.ts` computes normalized multi-objective candidate scores.
- `src/lib/planner/candidate-ranking.ts` ranks and selects destinations deterministically.
- `src/lib/planner/region-allocation.ts` assigns trip days across governorates and clusters.
- `src/lib/planner/intra-region-routing.ts` orders regional stops and fills days.
- `src/lib/planner/final-itinerary.ts` assembles traveler-facing output.
- `src/lib/planner/itinerary-repair.ts` applies deterministic post-generation repairs for budget and day utilization.

### Persistence Layer
- `src/lib/persistence/` stores saved interests, planner drafts, itineraries, and derived cost data in browser storage.
- The app remains functional without a backend because all challenge state is local.

## Determinism

The planner avoids randomization and uses stable ordering rules throughout:
- scores are rounded consistently
- ties are broken by slug or label
- region allocation uses deterministic marginal-gain passes
- itinerary repair uses stable replacement and fill ordering

This keeps results reproducible for the same profile, saved interests, locale, and dataset version.
