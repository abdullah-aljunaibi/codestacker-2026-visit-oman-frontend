# Planner Architecture (Design Level)

## Deterministic Pipeline
1. Normalize input profile (stable key ordering).
2. Filter destinations by hard constraints.
3. Score each destination by weighted criteria.
4. Select and schedule in stable sorted order.
5. Emit explanation with selected and excluded reasons.

## Determinism Rules
- No random seedless operations.
- Stable sort with deterministic tiebreaker (`slug`).
- Hash generated from normalized input + dataset version.

## Local Persistence
- `visit-oman.interests.v1`
- `visit-oman.itinerary.v1`
- `visit-oman.locale.v1`

## Explainability Contract
`PlannerExplanation` includes:
- weights used
- top factors per chosen destination
- exclusion reasons for filtered destinations
