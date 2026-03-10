# Visit Oman Frontend

Visit Oman is a Next.js + TypeScript travel-planning experience built for the CodeStacker 2026 frontend challenge. It combines destination discovery, saved-interest capture, and a deterministic itinerary planner that turns traveler preferences into an explainable multi-day trip.

## What Is Included
- Locale-aware marketing and discovery pages for `en` and `ar`
- Saved-interest workflow persisted in the browser
- Deterministic planner pipeline:
  - normalized multi-objective candidate scoring
  - hierarchical region-day allocation
  - intra-region stop routing
  - budget-aware itinerary repair
- Traveler-facing result page with contract traceability and persisted itinerary/cost summary

## Stack
- Next.js App Router
- React
- TypeScript
- Local static dataset for challenge content

## Run Locally
```bash
npm install
npm run dev
```

## Validation
```bash
npx tsc --noEmit
npm run build
```

## Project Structure
- `src/app/` application routes and UI
- `src/components/` shared client/server components
- `src/lib/data/` dataset loading and normalization
- `src/lib/planner/` deterministic planning pipeline
- `src/lib/persistence/` browser storage helpers
- `docs/ARCHITECTURE.md` system structure and boundaries
- `docs/ALGORITHM.md` planner algorithm details
- `docs/IMPLEMENTATION_HISTORY.md` condensed delivery history

## Notes
- The planner is intentionally deterministic: identical inputs and dataset state produce identical outputs.
- No external itinerary or mapping APIs are required.
