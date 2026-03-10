# Visit Oman Frontend Submission

Visit Oman is a bilingual Next.js trip-planning experience for the CodeStacker 2026 frontend challenge. It turns traveler preferences into a deterministic multi-day Oman itinerary, then presents the result as a traveler-facing daily plan with timed stops, estimated costs, and a future-ready map panel.

## Project Overview

The product has three main traveler flows:

1. Discover destinations from a static Oman dataset.
2. Save interesting places and shape a planning profile.
3. Generate a deterministic itinerary with explainable day cards.

Key submission highlights:

- English and Arabic support across the main traveler journey
- Deterministic planner pipeline from ranking to final itinerary
- Intra-region routing upgraded to beam search plus 2-opt refinement
- Traveler-oriented result page with timestamps, costs, crowd level, and explanations
- Browser persistence for planner draft, saved interests, and final itinerary

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript 5
- Static in-repo challenge dataset
- CSS via global design primitives in `src/app/globals.css`

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npx tsc --noEmit
npm run build
```

## Architecture Overview

Core code areas:

- `src/app/`: App Router routes and page composition
- `src/components/`: shared UI building blocks
- `src/lib/data/`: dataset loading and normalization
- `src/lib/planner/`: ranking, allocation, routing, repair, and itinerary assembly
- `src/lib/persistence/`: browser storage helpers
- `src/lib/i18n/`: locale resolution and message dictionaries
- `docs/ARCHITECTURE.md`: structure, data flow, SSR/CSR boundaries
- `docs/ALGORITHM.md`: planner logic and deterministic routing details

Planner pipeline:

1. Normalize challenge destinations into planner-ready domain objects.
2. Rank candidates with weighted multi-objective scoring.
3. Allocate trip days across regions.
4. Route stops within each region using beam search and 2-opt.
5. Assemble timed day plans and run deterministic repair for budget/use-of-day improvements.
6. Render a traveler-facing itinerary UI and persist it locally.

## Running Notes

- No external itinerary or map API is required.
- Routing and planning are deterministic for identical inputs and dataset state.
- The map on the result page is intentionally a placeholder container for later tile integration.

## Screenshots

Add final submission screenshots here:

- `docs/screenshots/home.png`
- `docs/screenshots/discovery.png`
- `docs/screenshots/planner-form.png`
- `docs/screenshots/planner-result-en.png`
- `docs/screenshots/planner-result-ar.png`

## Submission Checklist

- Bilingual traveler UI
- Deterministic planner pipeline
- Daily itinerary cards instead of raw contracts
- Submission documentation for architecture and algorithm
- Build and typecheck commands documented above
