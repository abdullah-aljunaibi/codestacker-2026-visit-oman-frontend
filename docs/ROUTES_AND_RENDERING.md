# Routes and Rendering Boundaries

## Rendering Principles
- Keep discovery content crawlable and fast with server rendering.
- Keep planner interactions client-driven for responsiveness and local state.
- Keep map code out of SSR runtime using dynamic client import.

## SSR Pages
- `/[locale]`
- `/[locale]/discover`
- `/[locale]/discover/[slug]`

## CSR Pages/Segments
- `/[locale]/planner`
- `/[locale]/planner/result`
- `/[locale]/saved`

## Shared Contracts
- Read-only destination dataset shared by SSR and CSR.
- Planner input/output types shared under `src/types`.
