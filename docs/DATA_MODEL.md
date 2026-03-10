# Data Model

## Destination
- `id: string`
- `slug: string`
- `name: { en: string; ar: string }`
- `description: { en: string; ar: string }`
- `region: string`
- `coordinates: { lat: number; lng: number }`
- `tags: string[]`
- `idealVisitMonths: number[]`
- `costLevel: "low" | "medium" | "high"`
- `recommendedDurationHours: number`

## InterestProfile
- `themes: string[]`
- `tripDays: number`
- `pace: "relaxed" | "balanced" | "packed"`
- `budget: "low" | "medium" | "high"`
- `travelMonth?: number`

## ItineraryPlan
- `id: string` (deterministic hash)
- `input: InterestProfile`
- `days: ItineraryDay[]`
- `score: number`
- `explanation: PlannerExplanation`
