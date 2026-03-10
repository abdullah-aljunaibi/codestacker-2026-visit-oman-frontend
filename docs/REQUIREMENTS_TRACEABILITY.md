# Requirements Traceability Audit

Audit date: 2026-03-09

Source of truth:
- `~/.openclaw/workspace/knowledge/codestacker-master-prompt.md`

Scope:
- This document audits codebase-facing product, algorithm, UX, persistence, and repository requirements from the master prompt.
- Process-only instructions such as "work in this order" or "final response format" are listed separately as non-code audit items.

Status legend:
- `Satisfied`: implemented and materially aligned with the brief.
- `Partial`: some implementation exists, but it does not fully match the brief.
- `Missing`: no meaningful implementation found.
- `N/A`: process-only or response-only requirement, not directly traceable to repository state.

## Summary

| Status | Count |
| --- | ---: |
| Satisfied | 53 |
| Partial | 88 |
| Missing | 132 |
| N/A | 4 |

High-risk gaps:
- The app still uses the custom `src/types/domain.ts` model and handcrafted sample dataset instead of the challenge dataset/schema.
- Discovery filters/sorting do not match the brief (`tag` and `budget` are implemented; category, season, crowd, and cost semantics are not).
- Planner inputs still allow `1-21` days and `high` budget rather than the required `1-7` and `luxury`.
- Region allocation and intra-region routing are deterministic, but they do not implement the required bounded-search/beam-search/2-opt strategy or the full daily constraints.
- Results UI is still contract/debug heavy and does not include timestamps, map, cost breakdown, or top-2 stop explanations.
- Persistence exists for saved interests and planner draft, but not for the final generated itinerary or cost breakdown.
- Repository polish is incomplete: README is phase-oriented, summaries remain at repo root, and no automated tests are present.

## Global Constraints

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| TypeScript everywhere | `Satisfied` | `src/**/*.ts`, `src/**/*.tsx`, `package.json`, `tsconfig.json` | The app code is entirely TypeScript/TSX. |
| Fully frontend only; no backend services, server APIs, or external compute | `Satisfied` | `src/app/**/*`, `src/lib/**/*` | No `app/api` routes or backend integrations were found. |
| All itinerary generation must happen in the browser | `Satisfied` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/*` | Result generation runs in a client component via `useMemo`. |
| No external routing or distance APIs | `Satisfied` | `src/lib/planner/intra-region-routing.ts`, `src/lib/planner/scoring-utils.ts` | Distance logic is local Haversine-style math only. |
| Map tiles may be used only for visualization | `Missing` | N/A | No map implementation exists. |
| No hardcoded itineraries or curated day plans | `Satisfied` | `src/lib/planner/candidate-ranking.ts`, `src/lib/planner/region-allocation.ts`, `src/lib/planner/intra-region-routing.ts`, `src/lib/planner/final-itinerary.ts` | The itinerary is derived algorithmically from planner inputs and the local dataset. |
| No randomness unless fully deterministic and documented; ideally use none | `Satisfied` | `src/lib/planner/*` | Stable sorting/tie-breaking is used; no random sources found. |
| Identical inputs must produce identical outputs | `Satisfied` | `src/lib/planner/*`, `src/lib/persistence/planner-draft.ts` | The ranking/allocation/routing pipeline is deterministic. |
| Use only the provided dataset for destination content | `Missing` | `src/data/destinations.sample.ts`, `src/types/domain.ts` | The repo still uses a handcrafted six-item sample dataset instead of the challenge dataset. |
| Support English and Arabic properly | `Partial` | `src/lib/i18n/config.ts`, `src/app/[locale]/*`, `src/components/*` | Route locale and RTL handling exist, but strings are scattered inline and parity is incomplete. |
| Keep SSR pages pre-renderable where required | `Partial` | `src/app/[locale]/page.tsx`, `src/app/[locale]/discover/page.tsx`, `src/app/[locale]/discover/[slug]/page.tsx` | Landing/discovery pages are server components, but detail pages do not implement `generateStaticParams` or another explicit static strategy. |
| Produce modular, maintainable code with clear comments for algorithmic logic | `Partial` | `src/lib/planner/*`, `src/lib/discovery/*` | The code is modular, but algorithm commentary is sparse and several modules still reflect phase scaffolding rather than final submission quality. |

## Phase 0: Requirement Audit And Traceability

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Create a traceability checklist mapping every requirement to status/files/notes | `Satisfied` | `docs/REQUIREMENTS_TRACEABILITY.md` | Implemented by this audit document. |

## Phase 1: Data And Schema Correctness

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Replace current custom model with the exact challenge dataset schema | `Missing` | `src/types/domain.ts` | The current canonical model still uses `tags`, `costLevel`, `popularityScore`, and `recommendedDurationHours`. |
| `tags` -> `categories` | `Missing` | `src/types/domain.ts`, `src/lib/discovery/query.ts`, `src/components/planner-form.tsx` | `tags` remains the core taxonomy field. |
| `costLevel` -> `ticket_cost_omr` | `Missing` | `src/types/domain.ts`, `src/lib/planner/scoring-primitives.ts` | Cost is ordinal tier-based rather than numeric OMR. |
| `popularityScore` -> `crowd_level` | `Missing` | `src/types/domain.ts`, `src/lib/discovery/query.ts`, `src/lib/planner/scoring-primitives.ts` | Popularity is used instead of challenge crowd semantics. |
| `recommendedDurationHours` -> `avg_visit_duration_minutes` | `Missing` | `src/types/domain.ts`, `src/lib/planner/*` | Durations remain stored as hours. |
| Plain string `region` -> localized `region.en` / `region.ar` | `Missing` | `src/types/domain.ts`, `src/data/destinations.sample.ts` | Regions are plain English strings. |
| Add `company` to dataset model | `Missing` | `src/types/domain.ts`, `src/data/destinations.sample.ts` | No `company` field exists. |
| Add `src/types/dataset.ts` | `Missing` | N/A | File not present. |
| Add `src/lib/data/load-destinations.ts` | `Missing` | N/A | File not present. |
| Add `src/lib/data/normalize-destinations.ts` | `Missing` | N/A | File not present. |
| Add `src/lib/data/selectors.ts` | `Missing` | N/A | File not present. |
| Keep dataset shape faithful to the brief | `Missing` | `src/types/domain.ts`, `src/data/destinations.sample.ts` | Current schema materially diverges from the brief. |
| Allow normalization only in a derived layer | `Missing` | `src/lib/discovery/query.ts`, `src/lib/planner/*` | No raw-vs-normalized data-layer split exists. |
| UI and planner consume normalized selectors rather than ad hoc mutation | `Missing` | `src/app/[locale]/*`, `src/components/planner-form.tsx`, `src/lib/planner/*` | Pages/components consume the sample objects directly. |
| Use the provided dataset, not a handcrafted subset | `Missing` | `src/data/destinations.sample.ts` | The dataset is explicitly a handcrafted sample scaffold. |
| If placeholder data is used temporarily, isolate and replace before final output | `Partial` | `src/data/destinations.sample.ts` | Placeholder data is isolated, but it has not been replaced. |
| All destination rendering comes from the provided dataset | `Missing` | `src/app/[locale]/*`, `src/data/destinations.sample.ts` | Rendering comes from the sample data. |
| All planner logic consumes challenge-aligned fields | `Missing` | `src/lib/planner/*`, `src/types/domain.ts` | Planner logic consumes old schema fields. |
| One canonical dataset contract used across SSR and CSR | `Partial` | `src/types/domain.ts`, `src/data/destinations.sample.ts` | There is one internal contract, but it is not challenge-aligned. |

## Phase 2: I18n And Layout Foundations

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Move scattered inline strings into message dictionaries or typed locale modules | `Partial` | `src/lib/i18n/messages/*.json`, `src/lib/discovery/content.ts`, `src/app/[locale]/*`, `src/components/*` | Some copy is centralized, but many user-facing strings remain inline in pages and components. |
| Ensure Arabic and English parity for all main product flows | `Partial` | `src/app/[locale]/*`, `src/components/*` | Both locales are present in major flows, but parity is inconsistent and often hardcoded per component. |
| Set correct `lang` and `dir` dynamically per locale | `Partial` | `src/app/layout.tsx`, `src/lib/i18n/config.ts` | Page `dir` is set in route content, but root `<html lang>` is fixed to `en` and no root-level dynamic `dir` is applied. |
| Locale switcher visible in main navigation | `Missing` | `src/app/[locale]/page.tsx`, `src/app/[locale]/discover/page.tsx` | No locale switcher is present. |
| Make region/category names render from selected locale | `Missing` | `src/types/domain.ts`, `src/data/destinations.sample.ts`, `src/app/[locale]/discover/page.tsx` | Destination names/descriptions are localized, but region and category/tag labels are not locale-aware data fields. |
| Make metadata locale-aware where practical | `Missing` | `src/app/layout.tsx` | Root metadata is static English-only. |
| No major user-facing flow relies on hardcoded mixed-language strings | `Partial` | `src/app/[locale]/*`, `src/components/*` | Most flows have dual-language branches, but they are inline and not centrally managed. |
| Arabic layout is truly RTL-aware, not just translated labels | `Partial` | `src/lib/i18n/config.ts`, `src/app/[locale]/*`, `src/app/globals.css` | `dir="rtl"` is applied at route level, but there is no broader audit of RTL-specific layout behavior. |
| English and Arabic pages feel equally supported | `Partial` | `src/app/[locale]/*`, `src/components/*` | Functional support exists, but the implementation still feels scaffolded rather than fully balanced. |

## Phase 3: SSR Discovery Experience

### 3.1 Landing Page

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Polished, server-rendered landing page | `Partial` | `src/app/[locale]/page.tsx` | The page is server-rendered, but the UX is a simple scaffold rather than a polished tourism landing page. |
| Hero section | `Satisfied` | `src/app/[locale]/page.tsx` | Present. |
| Category exploration sections derived from dataset | `Missing` | `src/app/[locale]/page.tsx`, `src/data/destinations.sample.ts` | No category exploration sections are rendered. |
| Featured destinations derived dynamically from dataset | `Missing` | `src/app/[locale]/page.tsx` | No featured destinations section exists. |
| Strong CTA to the planner | `Satisfied` | `src/app/[locale]/page.tsx` | Planner CTA is present. |
| Bilingual support on landing page | `Satisfied` | `src/app/[locale]/page.tsx`, `src/lib/discovery/content.ts` | Both locales render. |
| Do not manually author destination-specific content per card | `Satisfied` | `src/app/[locale]/page.tsx` | The landing page does not hardcode per-destination cards. |
| Derive featured/category sections programmatically from dataset content | `Missing` | `src/app/[locale]/page.tsx` | Required sections are absent. |
| Preserve a premium tourism feel | `Partial` | `src/app/[locale]/page.tsx`, `src/app/globals.css` | The shell is usable but not premium/polished. |

### 3.2 Discovery Catalogue

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Upgrade browse/filtering to support category | `Partial` | `src/lib/discovery/query.ts`, `src/app/[locale]/discover/page.tsx` | Implemented as `tag`, not challenge `category`. |
| Filter by region | `Satisfied` | `src/lib/discovery/query.ts`, `src/app/[locale]/discover/page.tsx` | Implemented. |
| Filter by recommended season | `Missing` | `src/lib/discovery/query.ts`, `src/app/[locale]/discover/page.tsx` | No season filter exists. |
| Sort by crowd level or estimated cost | `Partial` | `src/lib/discovery/query.ts`, `src/app/[locale]/discover/page.tsx` | Sorting supports cost and popularity, not challenge crowd level/cost semantics. |
| Filter state reflected in URL query params | `Satisfied` | `src/app/[locale]/discover/page.tsx`, `src/lib/discovery/query.ts` | Implemented via GET form + query parsing. |
| Sharable/reloadable views | `Satisfied` | `src/app/[locale]/discover/page.tsx` | Query-param driven SSR page reloads support this. |
| SSR-friendly data flow | `Satisfied` | `src/app/[locale]/discover/page.tsx` | Filtering runs in a server component. |
| Clean empty states | `Satisfied` | `src/app/[locale]/discover/page.tsx` | Empty state card exists. |

### 3.3 Destination Details

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Each destination page displays generated placeholder description text | `Partial` | `src/app/[locale]/discover/[slug]/page.tsx`, `src/data/destinations.sample.ts` | Description text exists, but it comes from the sample dataset rather than a generated placeholder layer over the challenge dataset. |
| Recommended months indicator | `Satisfied` | `src/app/[locale]/discover/[slug]/page.tsx` | Rendered as joined months. |
| Crowd level visualization | `Missing` | `src/app/[locale]/discover/[slug]/page.tsx` | No crowd field or visualization exists. |
| Estimated visit duration | `Satisfied` | `src/app/[locale]/discover/[slug]/page.tsx` | Rendered from `recommendedDurationHours`. |
| Map preview | `Missing` | `src/app/[locale]/discover/[slug]/page.tsx` | No map preview is rendered. |
| Statically renderable with `generateStaticParams` or equivalent | `Missing` | `src/app/[locale]/discover/[slug]/page.tsx` | No explicit static params strategy exists. |
| No client-only dependency required to show core details | `Satisfied` | `src/app/[locale]/discover/[slug]/page.tsx` | Core details are server-rendered. |
| Map preview degrades gracefully if interactive map is client-only | `Missing` | N/A | No map feature exists. |

### 3.4 Save-Interest Flow And Discovery UX

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Users can save destinations while browsing | `Satisfied` | `src/components/save-interest-button.tsx`, `src/app/[locale]/discover/page.tsx`, `src/app/[locale]/discover/[slug]/page.tsx` | Implemented. |
| Saved interests persisted locally | `Satisfied` | `src/lib/persistence/interests.ts`, `src/lib/persistence/keys.ts` | Stored in local storage. |
| Saved interests retained across refresh/navigation | `Satisfied` | `src/lib/persistence/interests.ts`, `src/components/save-interest-button.tsx`, `src/components/saved-interests-panel.tsx` | Read back on load. |
| Planner can consume saved interests without extra user re-entry | `Partial` | `src/components/planner-form.tsx`, `src/lib/persistence/interests.ts` | Saved slugs are imported, but preferred categories are not derived from them as required. |
| Card badges for crowd and cost | `Partial` | `src/app/[locale]/discover/page.tsx` | Simple meta chips exist for region/cost/duration, but no crowd badge and cost is still tier-based. |
| Strong category chips | `Missing` | `src/app/[locale]/discover/page.tsx` | No category chip system exists. |
| Clearer season display | `Missing` | `src/app/[locale]/discover/page.tsx`, `src/app/[locale]/discover/[slug]/page.tsx` | Season is only shown as raw month numbers on detail pages. |
| “Add to trip ideas” microcopy instead of raw technical labels | `Missing` | `src/components/save-interest-button.tsx` | Button copy is "Save as interest" / "Saved to interests". |
| More premium top navigation and footer | `Partial` | `src/app/[locale]/page.tsx`, `src/app/[locale]/discover/page.tsx` | Basic top nav exists; no footer and overall navigation is minimal. |
| Part 1 fully matches the brief | `Missing` | Multiple | Discovery still diverges on data model, filters, detail-page richness, and overall polish. |
| Discovery pages are coherent, polished, and localized | `Partial` | `src/app/[locale]/page.tsx`, `src/app/[locale]/discover/page.tsx`, `src/app/[locale]/discover/[slug]/page.tsx` | Coherent and localized enough to function, but not fully polished or brief-complete. |
| Saved interests bridge seamlessly into planning | `Partial` | `src/components/planner-form.tsx`, `src/components/saved-interests-panel.tsx` | Destination slugs bridge through, but category defaults and stronger UX linkage are missing. |

## Phase 4: Planner Input Contract

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Trip duration `1-7` | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Current range is `1-21`. |
| Budget tier `low | medium | luxury` | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts`, `src/types/domain.ts` | The app still uses `high` instead of `luxury`. |
| Travel month `1-12` | `Satisfied` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Implemented. |
| Travel intensity `relaxed | balanced | packed` | `Satisfied` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Implemented. |
| Preferred categories pre-populated from saved interests | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/interests.ts` | Saved destination slugs prefill selected destinations, but preferred categories/themes are not derived from saved interests. |
| Planner explains what affects itinerary generation | `Partial` | `src/components/planner-form.tsx` | There is a short intro sentence, but no clear explanation of scoring factors or generation behavior. |
| Saved destinations influence default category selection | `Missing` | `src/components/planner-form.tsx` | Not implemented. |
| User can still edit categories manually | `Partial` | `src/components/planner-form.tsx` | Users can edit `themes`, but these are tag-based and not challenge-aligned categories. |
| Validation is strict and user-friendly | `Partial` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Basic clamping exists, but validation is loose and off-spec because it still accepts unsupported values. |
| Form state persists locally | `Satisfied` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Implemented. |
| No unsupported input values remain | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | `high` and `1-21` are still supported. |
| `high` is replaced with `luxury` | `Missing` | `src/types/domain.ts`, `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Not implemented. |
| Day range is exactly `1-7` | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Not implemented. |
| Categories derived intelligently from saved interests | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/interests.ts` | Not implemented. |

## Phase 5: Deterministic Normalized Multi-Objective Scoring

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Normalized score includes interest match via Jaccard(categories_user, categories_i) | `Partial` | `src/lib/planner/scoring-primitives.ts` | There is an interest-match score, but it is overlap divided by user theme count, not true Jaccard over union. |
| Season fit via `SeasonFit(month, recommended_months_i)` | `Satisfied` | `src/lib/planner/scoring-primitives.ts` | Implemented as a deterministic circular month-distance fit. |
| Crowd penalty via normalized `crowd_level` | `Partial` | `src/lib/planner/scoring-primitives.ts`, `src/types/domain.ts` | Crowd is modeled indirectly via `popularityScore`, not challenge `crowd_level`. |
| Cost penalty via normalized `ticket_cost_omr` | `Missing` | `src/lib/planner/scoring-primitives.ts`, `src/types/domain.ts` | Cost is ordinal tier matching, not numeric ticket-cost normalization. |
| Detour penalty via current route impact | `Partial` | `src/lib/planner/scoring-primitives.ts` | Detour is centroid-based against selected points, not route-impact insertion cost. |
| Diversity gain via selected set contribution | `Satisfied` | `src/lib/planner/scoring-primitives.ts` | Implemented as marginal tag/region novelty. |
| All components normalized to `[0,1]` | `Satisfied` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | Values are clamped/normalized. |
| Pure functions only | `Satisfied` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | Scoring functions are pure. |
| Deterministic outputs | `Satisfied` | `src/lib/planner/weighted-scoring-engine.ts`, `src/lib/planner/candidate-ranking.ts` | Deterministic sorting/rounding is used. |
| No hidden state | `Satisfied` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | No hidden mutable state found. |
| Weights clearly documented and justified | `Partial` | `src/lib/planner/weighted-scoring-engine.ts`, `README.md` | Weights are present, but rationale is thin and README is not submission-grade. |
| Create scoring package like normalize/jaccard/season-fit/detour/diversity/final-score modules | `Missing` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | The logic exists, but it is not split into the requested scoring package structure. |
| Implement Jaccard correctly as intersection over union | `Missing` | `src/lib/planner/scoring-primitives.ts` | Current formula is not Jaccard. |
| Implement season fit deterministically and explain it | `Partial` | `src/lib/planner/scoring-primitives.ts` | Deterministic implementation exists, but explanation/documentation is light. |
| Crowd normalization from 1-5 into `[0,1]` | `Missing` | `src/lib/planner/scoring-primitives.ts`, `src/types/domain.ts` | The underlying field is not `crowd_level` 1-5. |
| Cost normalization over active dataset range | `Missing` | `src/lib/planner/scoring-primitives.ts` | Not implemented because ticket costs are not numeric. |
| Diversity gain favors underrepresented categories and avoids repetitive plans | `Partial` | `src/lib/planner/scoring-primitives.ts` | Some novelty behavior exists, but it is based on old tags and region novelty only. |
| Detour penalty based on additional route burden, not static popularity | `Partial` | `src/lib/planner/scoring-primitives.ts` | It is not popularity-based, but still not route-insertion burden. |
| Scoring matches challenge intent, not a simplified approximation | `Partial` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | The pipeline is directionally aligned but materially simplified versus the brief. |
| Every component inspectable and documented | `Partial` | `src/lib/planner/weighted-scoring-engine.ts`, `README.md` | Inspectable in code; documentation is incomplete. |
| Explanations can expose top score contributors later in the UI | `Satisfied` | `src/lib/planner/weighted-scoring-engine.ts`, `src/lib/planner/candidate-ranking.ts` | Contribution metadata and reason codes are exposed. |

## Phase 6: Region-Level Planning

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Use enumeration or bounded search over valid region allocations | `Missing` | `src/lib/planner/region-allocation.ts` | Current implementation is weighted distribution, not bounded search/enumeration. |
| Score allocations deterministically | `Partial` | `src/lib/planner/region-allocation.ts` | Deterministic weighting is used, but there is no search over allocation candidates. |
| Enforce at least 2 regions if trip duration >= 3 | `Missing` | `src/lib/planner/region-allocation.ts` | No explicit rule enforces this. |
| Enforce no region gets more than `ceil(days / 2)` days | `Missing` | `src/lib/planner/region-allocation.ts` | No explicit max-days-per-region constraint exists. |
| Deprioritize regions with poor season fit | `Missing` | `src/lib/planner/region-allocation.ts` | Season fit is not part of region allocation. |
| Preserve diversity and utility in allocation | `Partial` | `src/lib/planner/region-allocation.ts` | Allocation uses candidate hours and scores, but not explicit diversity reasoning. |
| Return ordered region allocation plan | `Satisfied` | `src/lib/planner/region-allocation.ts` | `dayRegionSequence` is returned. |
| Allocation score uses aggregate utility, season fit, inter-region diversity, seed-interest support, transition reasonableness | `Missing` | `src/lib/planner/region-allocation.ts` | Current weighting uses only recommended hours and candidate scores. |
| Allocation is algorithmic, not hardcoded | `Satisfied` | `src/lib/planner/region-allocation.ts` | Implemented algorithmically. |
| Constraints explicitly checked and testable | `Missing` | `src/lib/planner/region-allocation.ts` | Required constraints are not explicitly represented. |
| Region distribution looks realistic and challenge-compliant | `Partial` | `src/lib/planner/region-allocation.ts`, `src/app/[locale]/planner/result/page.tsx` | Outputs are plausible, but not challenge-compliant due to missing constraints. |

## Phase 7: Intra-Region Stop Selection And Routing

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Use beam search for stop selection | `Missing` | `src/lib/planner/intra-region-routing.ts` | Current approach is priority sort + nearest neighbor + day fill. |
| Follow with 2-opt for within-day route ordering improvement | `Missing` | `src/lib/planner/intra-region-routing.ts` | No 2-opt step exists. |
| Beam search is deterministic and stronger than naive greedy | `Missing` | `src/lib/planner/intra-region-routing.ts` | Not implemented. |
| Respect max daily driving distance: 250 km | `Missing` | `src/lib/planner/intra-region-routing.ts` | No hard 250 km constraint exists. |
| Respect max daily visit time: 8 hours | `Partial` | `src/lib/planner/intra-region-routing.ts` | `hoursPerDayTarget` is used as a soft fill target, not a hard constraint. |
| Each day starts and ends in the same region | `Partial` | `src/lib/planner/region-allocation.ts`, `src/lib/planner/intra-region-routing.ts` | Days are assigned to one region, but no explicit start/end modeling exists. |
| Avoid repeating the same category more than 2 times/day unless only one category selected | `Missing` | `src/lib/planner/intra-region-routing.ts` | No category repetition constraint exists. |
| Two long stops (>90 min) cannot be adjacent without a short stop (<45 min) between | `Missing` | `src/lib/planner/intra-region-routing.ts` | No adjacency/duration-class constraint exists. |
| Intensity cap relaxed: max 3 stops/day | `Missing` | `src/lib/planner/intra-region-routing.ts` | No stop-count cap exists. |
| Intensity cap balanced: max 4 stops/day | `Missing` | `src/lib/planner/intra-region-routing.ts` | No stop-count cap exists. |
| Intensity cap packed: max 5 stops/day | `Missing` | `src/lib/planner/intra-region-routing.ts` | No stop-count cap exists. |
| Build route generation in stages: candidate pool per region/day | `Partial` | `src/lib/planner/intra-region-routing.ts` | Region candidate pooling exists, but not explicit per-region/day candidate sets. |
| Deterministic beam expansion under constraints | `Missing` | `src/lib/planner/intra-region-routing.ts` | Not implemented. |
| Score partial plans using normalized scoring model plus constraint slack | `Missing` | `src/lib/planner/intra-region-routing.ts` | Not implemented. |
| Finalize stop set for the day | `Satisfied` | `src/lib/planner/intra-region-routing.ts` | Day plans are produced. |
| Run 2-opt on selected day route | `Missing` | `src/lib/planner/intra-region-routing.ts` | Not implemented. |
| Compute final leg distances and timing estimates | `Partial` | `src/lib/planner/intra-region-routing.ts`, `src/lib/planner/final-itinerary.ts` | Distance totals are computed; timing estimates beyond visit hours are not. |
| Define deterministic travel-time assumption globally | `Missing` | N/A | No global average-speed travel-time model exists. |
| No day violates stated constraints | `Missing` | `src/lib/planner/intra-region-routing.ts` | Required hard constraints are not all encoded. |
| Stop selection is clearly better than greedy-only | `Missing` | `src/lib/planner/intra-region-routing.ts` | The current algorithm is essentially greedy. |
| Route order improved with documented local-search step | `Missing` | `src/lib/planner/intra-region-routing.ts` | No local-search step exists. |

## Phase 8: Local Distance Utilities

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Implement `distanceKm(pointA, pointB)` using Haversine | `Satisfied` | `src/lib/planner/scoring-utils.ts`, `src/lib/planner/intra-region-routing.ts` | Haversine implementations exist, though duplicated. |
| Implement `totalKm(dayRoute)` | `Partial` | `src/lib/planner/intra-region-routing.ts` | Equivalent logic exists as `computeRouteTravelKm`, but not as a reusable utility. |
| Implement `detourKm(route, candidateStop)` | `Missing` | `src/lib/planner/scoring-primitives.ts` | No route-insertion detour utility exists; only centroid-based detour scoring. |
| Precompute a symmetric distance matrix if worthwhile | `Missing` | N/A | No distance matrix exists. |
| No external routing/distance API usage anywhere | `Satisfied` | `src/lib/planner/intra-region-routing.ts`, `src/lib/planner/scoring-utils.ts` | Satisfied. |
| All travel calculations locally derived and reusable | `Partial` | `src/lib/planner/scoring-utils.ts`, `src/lib/planner/intra-region-routing.ts` | Calculations are local, but not cleanly centralized or fully reusable. |

## Phase 9: Budget-Aware Itinerary Repair

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Compute displayed fuel cost = `total_km / 12 * fuel_price` | `Missing` | N/A | No cost model exists. |
| Compute displayed tickets cost = `sum(ticket_cost_omr)` | `Missing` | N/A | No ticket-cost model exists. |
| Compute displayed food cost = `6 OMR * days` | `Missing` | N/A | No cost model exists. |
| Compute hotel per night by budget tier (`20/45/90`) | `Missing` | N/A | No hotel-cost model exists. |
| Define and document budget thresholds per tier | `Missing` | N/A | Not implemented. |
| If itinerary exceeds budget threshold, run repair loop | `Missing` | N/A | Not implemented. |
| Reduce paid attractions when over budget | `Missing` | N/A | Not implemented. |
| Favor lower ticket-cost alternatives | `Missing` | N/A | Not implemented. |
| Preserve category coverage where possible | `Missing` | N/A | Not implemented. |
| Avoid collapsing itinerary quality unnecessarily | `Missing` | N/A | Not implemented. |
| Iteratively replace poor value-for-cost stops with ranked alternates | `Missing` | N/A | Not implemented. |
| Recompute cost and utility after each change | `Missing` | N/A | Not implemented. |
| Continue until budget satisfied or no better repair exists | `Missing` | N/A | Not implemented. |
| Cost is not cosmetic output only | `Missing` | N/A | Cost output does not exist. |
| Final plans react meaningfully to budget tier | `Partial` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | Budget affects scoring, but not final repair or displayed trip cost. |
| Tradeoffs documented in code and README | `Missing` | `README.md` | Documentation is not present. |

## Phase 10: Traveler-Facing Results Experience

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Replace debug-heavy result page with polished itinerary product | `Partial` | `src/app/[locale]/planner/result/page.tsx` | Some user-facing itinerary cards exist, but debug JSON still dominates the page. |
| Clear region allocation summary | `Partial` | `src/app/[locale]/planner/result/page.tsx` | Region/day context appears per day and in debug sections; no dedicated summary UI exists. |
| Day tabs or day selector | `Missing` | `src/app/[locale]/planner/result/page.tsx` | Not implemented. |
| Per-day itinerary timeline | `Missing` | `src/app/[locale]/planner/result/page.tsx` | Days are simple cards/lists, not timelines. |
| Timestamps | `Missing` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/final-itinerary.ts` | Not implemented. |
| Stop durations | `Partial` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/final-itinerary.ts` | Estimated visit hours per stop are shown, but not formatted as timeline durations. |
| Inter-stop travel distances | `Missing` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/final-itinerary.ts` | Only total daily km is shown. |
| Total daily km | `Satisfied` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/final-itinerary.ts` | Implemented. |
| Total trip km | `Satisfied` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/final-itinerary.ts` | Implemented. |
| Full cost breakdown | `Missing` | N/A | Not implemented. |
| Explanation panel showing why each stop was selected (top 2 contributing score components) | `Partial` | `src/lib/planner/weighted-scoring-engine.ts`, `src/lib/planner/final-itinerary.ts`, `src/app/[locale]/planner/result/page.tsx` | The data exists as reason codes, but there is no user-facing explanation panel and top-2 contributors are not shown per stop. |
| Client-only map view with markers for all stops | `Missing` | N/A | No map exists. |
| Route polyline per day | `Missing` | N/A | No map exists. |
| Active stop highlight synchronized with itinerary UI | `Missing` | N/A | No map exists. |
| Switching between days without losing map context | `Missing` | N/A | No map exists. |
| Preserve debug contracts only behind collapsible developer details | `Missing` | `src/app/[locale]/planner/result/page.tsx` | Raw contracts are always expanded inline. |
| Default result view is user-facing, not internal-debug-facing | `Partial` | `src/app/[locale]/planner/result/page.tsx` | There is a user-facing layer, but the page is still dominated by developer contract dumps. |
| Visually calm and premium | `Partial` | `src/app/[locale]/planner/result/page.tsx`, `src/app/globals.css` | Minimal styling exists, but not a premium travel-app result experience. |
| Easy to scan per day | `Partial` | `src/app/[locale]/planner/result/page.tsx` | Basic per-day cards exist. |
| Obvious cost and distance implications | `Partial` | `src/app/[locale]/planner/result/page.tsx` | Distance is visible; cost is absent. |
| Clear reasoning behind selections | `Partial` | `src/lib/planner/final-itinerary.ts`, `src/app/[locale]/planner/result/page.tsx` | Reason codes exist in data but are not surfaced cleanly to users. |
| Planner results inspire trust | `Partial` | `src/app/[locale]/planner/result/page.tsx` | Determinism helps, but missing costs/map/explanations/debug overload weakens trust. |
| Map and itinerary UI work together | `Missing` | N/A | Not implemented. |

## Phase 11: Persistence And State Continuity

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Refreshing must not lose saved interests | `Satisfied` | `src/lib/persistence/interests.ts` | Implemented. |
| Refreshing must not lose planner inputs | `Satisfied` | `src/lib/persistence/planner-draft.ts` | Implemented. |
| Refreshing must not lose final generated plan | `Missing` | `src/lib/persistence/keys.ts`, `src/app/[locale]/planner/result/page.tsx` | A storage key exists for itinerary, but it is never written/read. |
| Refreshing must not lose cost breakdown | `Missing` | N/A | Cost breakdown does not exist. |
| Version persisted storage keys | `Satisfied` | `src/lib/persistence/keys.ts` | Implemented. |
| Validate persisted payloads before hydrating | `Partial` | `src/lib/persistence/planner-draft.ts`, `src/lib/persistence/interests.ts` | Some shape checks/clamping exist, but there is no version-aware validation for all payloads. |
| Gracefully handle stale schema versions | `Missing` | `src/lib/persistence/*` | No schema-version migration logic exists beyond key version suffixes. |
| Keep SSR and CSR boundaries clean | `Satisfied` | `src/app/[locale]/*`, `src/components/*` | Discovery is SSR/server-component oriented; saved/planner/result flows are client-side. |
| User can browse, save, plan, refresh, and continue | `Partial` | `src/app/[locale]/*`, `src/lib/persistence/*` | This works for saved interests and planner draft, but not persisted generated itinerary. |
| No major state loss across the full journey | `Partial` | `src/lib/persistence/*`, `src/app/[locale]/planner/result/page.tsx` | There is still state loss for the final plan and any future cost output. |

## Phase 12: Repository And Submission Polish

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| README is the canonical submission document | `Missing` | `README.md` | README is phase-progress oriented, not final-submission oriented. |
| README includes project overview | `Partial` | `README.md` | High-level overview exists, but not as a polished submission narrative. |
| README includes how to run locally | `Missing` | `README.md` | Not adequately covered. |
| README includes architecture overview | `Partial` | `README.md`, `docs/PLANNER_ARCHITECTURE.md`, `docs/ROUTES_AND_RENDERING.md` | Some architecture docs exist, but README is not canonical. |
| README includes SSR vs CSR rendering boundaries | `Partial` | `README.md`, `docs/ROUTES_AND_RENDERING.md` | Separate docs exist; README does not fully integrate them. |
| README includes state management approach | `Partial` | `README.md`, `src/lib/persistence/*` | Not well documented in README. |
| README includes dataset handling approach | `Missing` | `README.md` | Not documented, and current handling is off-spec anyway. |
| README includes detailed itinerary algorithm explanation | `Partial` | `README.md`, `src/lib/planner/*` | Only high-level phase notes exist. |
| README includes weight selection rationale | `Missing` | `README.md`, `src/lib/planner/weighted-scoring-engine.ts` | Not documented sufficiently. |
| README includes normalization strategy | `Missing` | `README.md` | Not documented sufficiently. |
| README includes route improvement strategy (beam search + 2-opt) | `Missing` | `README.md` | Not applicable because the implementation does not use that strategy. |
| README includes budget repair approach | `Missing` | `README.md` | Not implemented. |
| README includes performance considerations | `Missing` | `README.md` | Not documented. |
| README includes known limitations and tradeoffs | `Partial` | `README.md` | Some deferred items are listed, but not as a final limitations section. |
| README includes screenshots or GIFs if possible | `Missing` | `README.md` | Not present. |
| Move `PHASE_*_SUMMARY.md` files into `docs/archive/` or fold into richer docs | `Missing` | Repo root `PHASE_*_SUMMARY.md` files | They remain in the root. |
| Remove dead code | `Partial` | Multiple | No obvious dead-code sweep is documented; some scaffold code remains active but off-spec. |
| Remove unused dependencies | `Partial` | `package.json` | No audit evidence; not verified from the brief perspective. |
| Clean naming and comments | `Partial` | Multiple | Naming is mostly coherent, but still phase-centric and scaffold-oriented. |
| Version the package sensibly for final submission | `Partial` | `package.json` | Not audited as a deliberate submission versioning strategy. |
| Add a small set of high-value tests | `Missing` | N/A | No test files were found. |
| Add tests for Jaccard scoring | `Missing` | N/A | Not present. |
| Add tests for season-fit scoring | `Missing` | N/A | Not present. |
| Add tests for Haversine distance | `Missing` | N/A | Not present. |
| Add tests for region allocation constraints | `Missing` | N/A | Not present. |
| Add tests for day-route constraint enforcement | `Missing` | N/A | Not present. |
| Add tests for budget repair behavior | `Missing` | N/A | Not present. |
| Add tests for determinism for identical inputs | `Missing` | N/A | Not present. |
| Optional: `docs/ARCHITECTURE.md` | `Missing` | `docs/*` | Related docs exist, but this exact consolidated file does not. |
| Optional: `docs/ALGORITHM.md` | `Missing` | `docs/*` | Not present. |
| Optional: `docs/DECISIONS.md` | `Missing` | `docs/*` | Not present. |
| Optional: short demo video or GIFs | `Missing` | N/A | Not present. |
| Optional: requirements traceability table linked from README | `Missing` | `README.md`, `docs/REQUIREMENTS_TRACEABILITY.md` | This file is new and README does not link to it yet. |
| Structure repo so it can later be mirrored cleanly into a public submission repo | `Partial` | Repo root, `docs/*` | The repo is modular, but root-level phase artifacts and incomplete submission docs still create cleanup work. |

## Design And UX Direction

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Give the product a premium tourism feel | `Partial` | `src/app/globals.css`, `src/app/[locale]/*` | The UI is clean but still scaffold/minimum-product in feel. |
| Visual system feels elegant | `Partial` | `src/app/globals.css` | Some styling exists, but not to the level described. |
| Visual system feels spacious | `Partial` | `src/app/globals.css` | Basic spacing exists. |
| Visual system feels trustworthy | `Partial` | `src/app/[locale]/planner/result/page.tsx` | Deterministic output helps, but debug-heavy UI and missing costs/map hurt trust. |
| Visual system feels modern | `Partial` | `src/app/globals.css` | Serviceable but not notably modern/premium. |
| Visual system is bilingual-first | `Partial` | `src/app/[locale]/*`, `src/lib/i18n/config.ts` | Locale routing exists, but bilingual UX is still scaffold-level. |
| Avoid hackathon-debug aesthetic | `Missing` | `src/app/[locale]/planner/result/page.tsx` | The results page still exposes large debug JSON blocks by default. |
| Consistent spacing | `Partial` | `src/app/globals.css` | Basic consistency exists. |
| Strong typography hierarchy | `Partial` | `src/app/globals.css` | Present at a basic level only. |
| Clean card system | `Satisfied` | `src/app/globals.css`, `src/app/[locale]/*`, `src/components/*` | Card-based layout is consistently used. |
| Tasteful metadata chips | `Partial` | `src/app/[locale]/discover/page.tsx`, `src/app/[locale]/planner/result/page.tsx` | Meta chips exist, but content and polish are limited. |
| Restrained color usage | `Satisfied` | `src/app/globals.css` | Styling appears restrained. |
| Obvious CTAs | `Satisfied` | `src/app/[locale]/page.tsx`, `src/app/[locale]/discover/page.tsx`, `src/components/*` | Core CTAs are clear. |
| Polished empty/loading states | `Partial` | `src/app/[locale]/discover/page.tsx`, `src/components/saved-interests-panel.tsx` | Empty states exist; polished loading states are not evident. |
| Do not overdesign at the expense of clarity | `Satisfied` | `src/app/[locale]/*` | The current issue is under-design rather than overdesign. |

## Engineering Principles

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Single source of truth for data contracts | `Partial` | `src/types/domain.ts`, `src/data/destinations.sample.ts` | There is one internal contract, but it is not the challenge dataset contract. |
| Pure, testable algorithm functions | `Partial` | `src/lib/planner/*` | Mostly pure, but not backed by tests. |
| UI separated from planning logic | `Satisfied` | `src/app/[locale]/planner/result/page.tsx`, `src/lib/planner/*` | Planning logic lives in `src/lib/planner`. |
| SSR for discovery, CSR for planner/results | `Satisfied` | `src/app/[locale]/discover/page.tsx`, `src/app/[locale]/planner/page.tsx`, `src/app/[locale]/planner/result/page.tsx` | This boundary is implemented. |
| Localized content should not fork logic unnecessarily | `Partial` | `src/app/[locale]/*`, `src/components/*` | Many components inline locale branches rather than using shared typed dictionaries. |
| Determinism over cleverness | `Satisfied` | `src/lib/planner/*` | The planner prioritizes determinism. |
| Readable code over magic abstractions | `Satisfied` | `src/lib/planner/*`, `src/app/[locale]/*` | The code is straightforward and readable. |
| Judge-facing clarity matters | `Partial` | `README.md`, `src/app/[locale]/planner/result/page.tsx`, `docs/*` | Internal phase clarity exists, but judge-facing submission polish is incomplete. |

## Definition Of Done

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| App matches challenge requirements end to end | `Missing` | Multiple | Major gaps remain across data, discovery, planner inputs, routing, results, and docs. |
| Destination content comes only from provided dataset | `Missing` | `src/data/destinations.sample.ts` | Not implemented. |
| Discovery is SSR-first and polished | `Partial` | `src/app/[locale]/page.tsx`, `src/app/[locale]/discover/page.tsx` | SSR-first yes; polished/no. |
| Details pages are pre-renderable and localized | `Partial` | `src/app/[locale]/discover/[slug]/page.tsx` | Localized yes; explicit pre-render strategy missing. |
| Saved interests persist and feed planner defaults | `Partial` | `src/lib/persistence/interests.ts`, `src/components/planner-form.tsx` | Saved slugs persist, but category defaults are not derived. |
| Planner inputs exactly match the brief | `Missing` | `src/components/planner-form.tsx`, `src/lib/persistence/planner-draft.ts` | Not implemented. |
| Scoring is normalized, deterministic, and documented | `Partial` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts`, `README.md` | Normalized/deterministic yes; documentation and formula fidelity are incomplete. |
| Region allocation enforces all stated constraints | `Missing` | `src/lib/planner/region-allocation.ts` | Not implemented. |
| Daily routing uses a non-greedy improvement strategy | `Missing` | `src/lib/planner/intra-region-routing.ts` | Not implemented. |
| Distances are local/Haversine-based | `Satisfied` | `src/lib/planner/scoring-utils.ts`, `src/lib/planner/intra-region-routing.ts` | Implemented. |
| Budget meaningfully changes plan outcomes | `Partial` | `src/lib/planner/scoring-primitives.ts`, `src/lib/planner/weighted-scoring-engine.ts` | Budget influences ranking only; no repair/cost layer. |
| Result UI includes map, costs, timestamps, and explanations | `Missing` | `src/app/[locale]/planner/result/page.tsx` | Not implemented. |
| Persistence survives refresh | `Partial` | `src/lib/persistence/*`, `src/app/[locale]/planner/result/page.tsx` | Partial due to missing itinerary persistence. |
| README is strong enough for judges to quickly understand architecture and algorithm | `Missing` | `README.md` | Not implemented. |
| Codebase is clean, modular, and test-backed where it matters most | `Partial` | `src/lib/planner/*`, `docs/*`, N/A tests | Modular yes; tests missing. |
| Product feels like one coherent traveler experience rather than separate phases | `Missing` | `README.md`, `src/app/[locale]/planner/result/page.tsx`, repo root phase files | The repo and UX still expose phase-by-phase scaffolding heavily. |

## Non-Code / Process Requirements

| Requirement | Status | Implementation file(s) | Notes |
| --- | --- | --- | --- |
| Work in the prescribed execution order | `N/A` | N/A | Process instruction for implementation workflow, not directly auditable from final code alone. |
| Do not leave challenge-critical unresolved work markers | `N/A` | N/A | Can only be inferred indirectly; not encoded as a traceable code artifact. |
| Final deliverable should include summary/compliance checklist/decisions/limitations/screenshots suggestions | `N/A` | N/A | Response-format requirement rather than repository requirement. |
| Optimize for judges on compliance/UX/algorithm/docs/code hygiene | `N/A` | N/A | High-level evaluation criterion rather than discrete code artifact. |

## Evidence Notes

- No automated tests were found via `rg --files -g '*test*' -g '*spec*' .`.
- The current repository state is explicitly phase-oriented in `README.md`, `STATUS.md`, `PROGRESS.md`, and root-level `PHASE_*_SUMMARY.md` files.
- The current planner result screen still exposes raw JSON contracts inline rather than behind a developer-details affordance.
