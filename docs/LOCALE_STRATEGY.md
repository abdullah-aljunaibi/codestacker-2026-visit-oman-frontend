# Locale Strategy (Arabic/English)

## Locales
- Supported locales: `en`, `ar`
- Default locale: `en`
- Locale in route segment: `/[locale]/...`

## Directionality
- `en` -> `ltr`
- `ar` -> `rtl`
- Layout chooses `dir` based on locale to prevent ad-hoc overrides.

## Content Sources
- UI messages: `src/lib/i18n/messages/{en,ar}.json`
- Dataset fields: localized strings directly in destination entries.
