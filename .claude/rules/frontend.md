# Frontend Coding Standards

Applies to client-side code: React, Vue, Svelte, Angular, or vanilla JS/TS.

## Components

- One component per file. File name matches component name.
- Keep components under 150 lines. Extract sub-components when exceeding this.
- Separate presentational components (rendering) from container components (data/logic).
- Props are explicitly typed. No `any` types for component interfaces.
- Default prop values are declared at the component level, not scattered in the template.

## State Management

- Local state for UI-only concerns (open/closed, hover, form inputs).
- Shared state (context, stores, signals) for data used across multiple components.
- Server state belongs in a data-fetching layer (React Query, SWR, or equivalent). Do not duplicate server state in client stores.
- Never mutate state directly. Use immutable update patterns or framework-provided setters.

## Styling

- Use a consistent approach: CSS modules, Tailwind, styled-components, or framework scoped styles. Do not mix approaches in the same project.
- No inline styles except for truly dynamic values (e.g., computed positions).
- Design tokens (colors, spacing, typography) come from a shared theme. No magic numbers.
- Mobile-first responsive design. Test at 320px, 768px, and 1280px breakpoints minimum.

## Data Fetching

- All API calls go through a centralized client (e.g., an Axios instance or fetch wrapper).
- Handle loading, error, and empty states for every async data dependency.
- Show skeleton loaders or spinners. Never leave the user staring at a blank screen.
- Cache responses appropriately. Invalidate on mutations.

## Accessibility

- All interactive elements are keyboard-navigable.
- Images have meaningful alt text. Decorative images use `alt=""`.
- Form inputs have associated labels. Use `aria-` attributes when native semantics are insufficient.
- Color is never the sole indicator of state. Pair with icons, text, or patterns.
- Test with a screen reader at least once per feature.

## Build and Bundle

- Tree-shake unused code. No barrel files that re-export entire directories.
- Lazy-load routes and heavy components. Eagerly load only the critical path.
- Target modern browsers unless your analytics show significant legacy traffic.
- Environment variables prefixed with the framework convention (VITE_, NEXT_PUBLIC_, etc.).

## Testing

- Unit test utility functions and hooks/composables.
- Integration test critical user flows (login, checkout, form submission).
- Visual regression tests for shared UI components.
- Mock API calls at the network layer (MSW, cy.intercept), not inside components.
