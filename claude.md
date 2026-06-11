# Claude Notes

This repo is the Gezroni prototype. Work carefully: the product direction is a public farm board, not online shopping.

## Product Rules

- Keep the existing green Israeli agriculture identity.
- Preserve RTL Hebrew UX.
- Do not introduce cart, checkout, payment, or order language.
- Public users should discover farms, produce, prices, location, and direct contact details.
- Farmer signup should be secondary to public farm discovery on the landing page.
- The farmer dashboard is for managing a farm listing, not managing ecommerce orders.

## Technical Notes

- The app is static and starts at `index.html`.
- `src/app/main.js` controls hash routing.
- `src/app/shell.js` owns the global route switcher and accessibility widget.
- `src/screens/home.js`, `src/screens/market.js`, and `src/screens/dashboard.js` are the primary screens.
- `src/lib/maps.js` owns Google Maps loading and map interactions.
- `src/styles/screens.css` is the main stylesheet and is large; prefer scoped, minimal changes.
- Use `apply_patch` for manual edits.
- Prefer `rg` for search.

## Current Branch Context

Recent work fixed:

- Mobile home centering.
- CTA hierarchy on home.
- Public/farmer visibility of the global `חקלאי` nav link.
- Mobile map popup button visibility.
- Farm detail modal layering above the global nav.
- Scroll lock and focus restore while the farm detail modal is open.
- Closing Google InfoWindow before opening farm detail modal.
- Removal of unused cart code/CSS.
- Service worker and module cache busting.

## QA Expectations

Before pushing UI changes, test at least:

- `#home` at mobile width around `430px`.
- `#market` at mobile width around `430px`.
- `#home` and `#market` at desktop width.
- Map load and farm card click.
- Map popup `פרטי המשק` button.
- Farm detail modal open/close.
- Public user state where `חקלאי` nav should be hidden.

Known current warning: Google Maps `Marker` deprecation. Plan migration later, but do not mix it into unrelated UX work unless asked.

## Deployment Notes

- If JS/CSS behavior changes, update the query string in `index.html`/`src/app/main.js` and bump `CACHE_NAME` in `sw.js`.
- Push risky work to a feature branch first. Do not merge to `main` unless explicitly requested.
