# Gezroni Handoff

Last updated: 2026-06-12

## Current State

Gezroni is a static RTL Hebrew single page app for connecting Israeli residents with local farmers. It is not an ecommerce site: there is no cart, checkout, or online purchasing flow. The public product is a farm board with real map discovery, farm details, produce, prices, location, and direct contact.

The app is served from `index.html` and routed by hash routes through `src/app/main.js`:

- `#home` - public landing page with the green hero, today deals, home map preview, price comparison, and explanation.
- `#market` - farm board with filters, Google Map, farm cards, nearby deals, and farm detail modal.
- `#dashboard` - farmer dashboard for managing a farm listing and produce.
- `#apply` - farmer application form.
- `#admin` - admin review tools.

## Latest Local Changes

The current branch contains mobile and UX fixes that have not been merged into `main` yet:

- Mobile home hero is centered and constrained to the viewport.
- Primary CTA is now `מצא משקים עכשיו`; farmer signup is intentionally secondary and links to `#apply`.
- Global shell nav hides the `חקלאי` route for public/non-farmer users.
- Farmer nav appears only when the signed-in user has farmer/admin role, an existing farm row, or an application row.
- Farm detail modal now opens above the global nav, locks background scroll, restores focus on close, and hides the top route switcher while open.
- Opening farm details from the map closes the Google InfoWindow first.
- Map InfoWindow actions were moved higher so `פרטי המשק` remains visible on mobile.
- Legacy cart code and cart CSS were removed because the product no longer supports buying on site.
- Cache names and module query strings were bumped so deployed clients do not stay on stale JS/CSS.

## Important Files

- `src/app/shell.js` - global app shell, route switcher, accessibility widget, auth-aware farmer nav visibility.
- `src/app/main.js` - route resolution and screen mounting.
- `src/screens/home.js` - landing page content and home map preview initialization.
- `src/screens/market.js` - farm board, filters, map/list sync, farm detail modal.
- `src/lib/maps.js` - Google Maps loading, markers, info windows, map focus behavior.
- `src/styles/screens.css` - main shared styling for all screens.
- `src/data/produce-catalog.js` and `src/data/produce-art.js` - produce catalog and generated produce art references.
- `sw.js` - service worker cache version.

## QA Already Run

Local static server was tested on `http://127.0.0.1:3002` with Playwright:

- Mobile viewport: `430x932`.
- Desktop viewport: `1440x1000`.
- Home page loads and hero center delta is `0`.
- No horizontal overflow on home or market.
- Public user sees `בית` and `לוח משקים`, while `חקלאי` is hidden.
- Market page loads 10 farm cards.
- Google Map initializes.
- Clicking a farm opens a map popup.
- `פרטי המשק` button is visible in the mobile map popup.
- Opening farm details closes the map popup.
- Farm details modal opens full screen on mobile and hides the global nav.
- No page errors during the smoke checks.

Known warning: Google logs that `google.maps.Marker` is deprecated in favor of `AdvancedMarkerElement`. It does not currently break behavior, but it should be migrated in a future map cleanup.

## Current Caveats

- This remains a static client app with Supabase calls directly from the browser.
- Auth/role logic is lightweight and currently checks role metadata, `farms.user_id`, and `farm_applications.applicant_email`.
- The dashboard still has some old internal names such as `orders` for listing tabs. They are product-management UI now, not checkout/order flows.
- `src/styles/screens.css` is large and still contains duplicated historic selectors. Avoid broad refactors unless testing time is available.

## Recommended Next Steps

1. Test the farmer logged-in state with a real farmer user in production.
2. Migrate Google Maps markers to `AdvancedMarkerElement`.
3. Split market, dashboard, and home CSS into scoped files when the project gets a build step.
4. Add an explicit user profile/role table before expanding auth behavior.
5. Add automated browser smoke tests for home, market, map popup, farm detail modal, and dashboard auth.
