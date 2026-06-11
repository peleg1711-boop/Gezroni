# Agents Guide

This file is for AI agents working on Gezroni.

## Prime Directive

Gezroni is a farm discovery board for direct farmer contact. It is not an ecommerce app. Do not add buying flows unless the user explicitly changes the product direction.

## Safe Workflow

1. Confirm the repo and branch with `git status --short --branch`.
2. Read the relevant screen and shared helper before editing.
3. Keep changes small and aligned with the existing visual language.
4. Use explicit file staging when committing.
5. Run smoke checks before pushing.
6. Push feature work to a branch. Do not merge without an explicit request.

## Repo Map

- `index.html` - static entry point and service worker registration.
- `sw.js` - network-first service worker cache.
- `src/app/main.js` - hash router and screen lifecycle.
- `src/app/shell.js` - global shell, nav, accessibility widget.
- `src/screens/home.js` - landing screen.
- `src/screens/market.js` - farm board and detail modal.
- `src/screens/dashboard.js` - farmer listing dashboard.
- `src/screens/apply.js` - farmer application.
- `src/screens/admin.js` - admin tools.
- `src/lib/maps.js` - Google Maps integration.
- `src/lib/supabase.js` - Supabase client.
- `src/data/produce-catalog.js` - produce catalog.
- `src/data/produce-art.js` - produce image lookup.
- `src/styles/screens.css` - global screen styles.

## UI Guardrails

- Keep Hebrew RTL copy natural and concise.
- Keep `מצא משקים עכשיו` as the main public action.
- Keep farmer signup and dashboard actions visually secondary on public screens.
- Hide farmer-only navigation from users who are not farmers/admins.
- Modal overlays must sit above the global route switcher.
- Mobile must not have horizontal overflow.
- Map popups must keep their main action visible on mobile.

## Validation Checklist

Use a local static server, for example:

```bash
python3 -m http.server 3001
```

Then verify:

- `http://127.0.0.1:3001/#home`
- `http://127.0.0.1:3001/#market`
- Mobile viewport around `430x932`.
- Desktop viewport around `1440x1000`.
- No JS page errors.
- No horizontal overflow.
- Market cards render.
- Map renders.
- Clicking a farm focuses/opens map details.
- Farm detail modal hides the top nav and locks background scroll.

## Known Risk Areas

- `src/styles/screens.css` still contains legacy shared selectors and should be edited surgically.
- Google Maps currently uses deprecated `google.maps.Marker`.
- Auth role checks are client-side convenience checks and should be backed by a real profile/role table later.
- Service worker cache can keep old assets around if `CACHE_NAME` is not bumped.
