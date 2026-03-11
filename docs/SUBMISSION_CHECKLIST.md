# Submission Checklist

Final release checklist for the Visit Oman frontend submission.

## Repository

- [x] Public GitHub repo
- [x] No build artifacts committed (`.next/`, `node_modules/`, `out/` in `.gitignore`)
- [x] No unused dependencies
- [x] Package version set to `1.0.0`

## Build and Verification

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes (zero warnings)
- [x] `npm run test` passes (46 unit tests)
- [x] `npm run build` passes
- [x] `npm run verify` runs all four steps in sequence

## Application

- [x] App runs locally with `npm run dev`
- [x] Landing page loads at `/en` and `/ar`
- [x] Discovery page renders server-side
- [x] Detail page renders with map preview
- [x] Save interest button works
- [x] Saved page shows persisted interests
- [x] Planner form pre-populates from saved interests
- [x] Planner result renders with map, cost cards, and day switching
- [x] Itinerary persists on page refresh
- [x] Arabic routes render with RTL layout

## Planner Compliance

- [x] No backend or external API dependency for planning
- [x] No external routing API (Haversine only)
- [x] Planner is deterministic (same input produces same output)
- [x] All destination content from local dataset (`challenge-dataset.v3`)
- [x] Scoring uses 6 explicit weighted primitives
- [x] Region allocation enforces min-2-region and max-per-region rules
- [x] Routing enforces all hard constraints (distance, time, same-region, rest-gap, category repeat, intensity caps)
- [x] Budget repair swaps expensive stops for cheaper alternatives
- [x] Cost model covers fuel, tickets, food, and hotel

## Documentation

- [x] README is a complete judge-facing submission document
- [x] `docs/ALGORITHM.md` matches current implementation
- [x] `docs/REQUIREMENTS_TRACEABILITY.md` is accurate and current
- [x] Screenshots committed under `docs/screenshots/`
- [x] No placeholder or stale language in documentation
- [x] Bilingual routes confirmed (English and Arabic)
- [x] Persistence confirmed (interests, draft, itinerary, cost)
