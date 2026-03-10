# Requirements Traceability

Audit date: 2026-03-10

Scope:
- This document traces the current repository state for the Visit Oman frontend submission.
- It maps challenge-facing requirements to implementation status, source files, and concrete notes.
- It intentionally replaces the previous stale audit instead of patching it incrementally.

Status legend:
- `Satisfied`: implemented in the current codebase and aligned with the challenge intent.
- `Partial`: implemented in part, but still missing an expected submission-quality element.
- `Missing`: no committed implementation found in this repository.

## Summary

| Requirement area | Status |
| --- | --- |
| Dataset-only discovery | `Satisfied` |
| SSR pages | `Satisfied` |
| Static detail preview | `Satisfied` |
| Saved interests | `Satisfied` |
| Planner contract | `Satisfied` |
| Scoring formula | `Satisfied` |
| Region allocation | `Satisfied` |
| Routing constraints | `Satisfied` |
| Beam search + 2-opt | `Satisfied` |
| Haversine distance | `Satisfied` |
| Full cost model | `Satisfied` |
| Budget repair | `Satisfied` |
| Itinerary map | `Satisfied` |
| Day switching | `Satisfied` |
| Stop explanations | `Satisfied` |
| Persistence | `Satisfied` |
| Tests | `Missing` |
| README completeness | `Partial` |

## Requirements Matrix

| Challenge requirement | Status | File path(s) | Implementation note |
| --- | --- | --- | --- |
| Discovery must use the bundled dataset only, with no backend content source or external planner data | `Satisfied` | `src/data/challenge-dataset.ts` | `src/lib/data/load-destinations.ts` | `src/lib/data/selectors.ts` | `src/app/[locale]/page.tsx` | `src/app/[locale]/discover/page.tsx` | `src/app/[locale]/discover/[slug]/page.tsx` | Discovery pages load `challenge-dataset.v3` from the repo, normalize locally, and do not call remote content APIs. |
| Discovery pages should be SSR/pre-renderable | `Satisfied` | `src/app/[locale]/page.tsx` | `src/app/[locale]/discover/page.tsx` | `src/app/[locale]/discover/[slug]/page.tsx` | `src/app/[locale]/layout.tsx` | Landing, discovery, and detail routes are server components. Locale routes use `generateStaticParams`, and detail pages also expose `generateStaticParams` for slug pre-rendering. |
| Destination detail should provide a static map-style preview before client hydration | `Satisfied` | `src/app/[locale]/discover/[slug]/page.tsx` | `src/components/maps/static-destination-preview.tsx` | `src/components/maps/destination-preview-hydrated.client.tsx` | The detail page renders `StaticDestinationPreview` first, then layers in the hydrated interactive preview client-side. |
| Saved interests must bridge discovery into planning | `Satisfied` | `src/lib/persistence/interests.ts` | `src/app/[locale]/saved/page.tsx` | `src/components/save-interest-button.tsx` | `src/components/planner-form.tsx` | Saved destination slugs are versioned in browser storage, surfaced on `/saved`, and used to derive planner default categories. |
| Planner input must match the challenge contract: categories, `1..7` days, `relaxed|balanced|packed`, `low|medium|luxury`, month `1..12` | `Satisfied` | `src/types/domain.ts` | `src/components/planner-form.tsx` | `src/lib/persistence/planner-draft.ts` | The form and persisted draft enforce the current contract, clamp days to `1..7`, and migrate older budget values into the final budget tiers. |
| Candidate scoring must implement a transparent deterministic multi-objective formula | `Satisfied` | `src/lib/planner/scoring-primitives.ts` | `src/lib/planner/weighted-scoring-engine.ts` | The planner uses explicit weighted metrics for interest match, season fit, normalized crowd, normalized cost, detour penalty, and diversity gain with deterministic rounding and slug tie-breaks. |
| Region allocation must be explicit, deterministic, and constraint-aware | `Satisfied` | `src/lib/planner/region-allocation.ts` | Region allocation now performs bounded search over feasible region sets, day compositions, and ordered blocks. It encodes minimum-region and maximum-days-per-region rules and scores allocations with utility, season, diversity, coverage, balance, and transition penalties. |
| Daily routing must enforce routing constraints instead of naive greedy ordering | `Satisfied` | `src/lib/planner/intra-region-routing.ts` | The route validator enforces same-region days, max daily driving `250 km`, max daily visit time `8 hours`, stop caps by pace, category repeat limits, and the long-stop adjacency rule. |
| Intra-region routing should use deterministic beam search plus 2-opt refinement | `Satisfied` | `src/lib/planner/intra-region-routing.ts` | Candidate stops are explored through bounded beam search with `beamWidth = 4`, then route order is improved with validity-checked 2-opt passes. |
| Local distance calculations must use Haversine, not routing APIs | `Satisfied` | `src/lib/geo/haversine.ts` | `src/lib/geo/distance-matrix.ts` | `src/lib/planner/scoring-utils.ts` | Great-circle distance is computed locally and reused through a symmetric distance matrix; no external routing or distance APIs are used. |
| The result must expose a full trip cost model | `Satisfied` | `src/lib/planner/cost-model.ts` | `src/app/[locale]/planner/result/page.tsx` | Fuel, ticket, food, and hotel costs are computed explicitly, rolled into totals and per-day averages, and compared against a budget threshold. |
| The planner should repair over-budget itineraries rather than only reporting failure | `Satisfied` | `src/lib/planner/itinerary-repair.ts` | `src/lib/planner/final-itinerary.ts` | The repair stage swaps expensive stops for cheaper same-region alternatives with overlapping categories, then fills underutilized days with nearby unscheduled options when valid. |
| The final itinerary should include a visual map | `Satisfied` | `src/app/[locale]/planner/result/page.tsx` | `src/components/maps/itinerary-map.client.tsx` | The result page renders a client-only Leaflet map with polylines and markers for each day while keeping the rest of the result UI server-independent and local. |
| Travelers should be able to switch between days in the result view | `Satisfied` | `src/app/[locale]/planner/result/page.tsx` | Result tabs persist `selectedDayNumber`, support click and keyboard navigation, update the active map route, and keep the selected stop in sync. |
| Stops should explain why they were selected | `Satisfied` | `src/lib/planner/weighted-scoring-engine.ts` | `src/lib/planner/candidate-ranking.ts` | `src/app/[locale]/planner/result/page.tsx` | Score contributions are preserved through ranking and itinerary assembly, then rendered as top-contributor labels and traveler-facing explanations on the result page. |
| Planner state and result state should persist locally with versioning/migration | `Satisfied` | `src/lib/persistence/keys.ts` | `src/lib/persistence/interests.ts` | `src/lib/persistence/planner-draft.ts` | `src/lib/persistence/itinerary.ts` | Interests, planner draft, itinerary, and cost breakdown all use versioned browser keys. Legacy payloads are read through compatibility paths and migrated to schema version `2` where applicable. |
| The repository should include automated tests for the planner and submission-critical flows | `Missing` | `package.json` | No repository test suite is committed. `package.json` exposes `dev`, `build`, `start`, and `lint`, but there are no app-owned `*.test.*`, `*.spec.*`, `tests/`, or e2e files. |
| README should be submission-complete and reflect the final repository state | `Partial` | `README.md` | The README is strong on architecture, scoring, routing, cost model, persistence, screenshots to capture, and verification guidance. It is still incomplete as final submission polish because the repo has no committed screenshots, no automated test section beyond build verification, and no direct link to this traceability document. |

## Notes On Gaps

### Tests

- No automated unit, integration, or e2e coverage is committed today.
- Current verification is build-first via `npm run build`.

### README completeness

- `README.md` documents the implemented planner well, including formulas and repository structure.
- The remaining gaps are repository-polish gaps, not architecture gaps:
  - screenshots are described but not committed
  - automated tests are still absent
  - traceability is not linked from the README

## Verification Baseline

The current repository state is consistent with this traceability map when checked against:

- `npm run build`
- source inspection of `src/app/[locale]/*`
- source inspection of `src/lib/data/*`
- source inspection of `src/lib/planner/*`
- source inspection of `src/lib/persistence/*`
- source inspection of `README.md`
