# Handoff - Gezroni / מהשדה לשולחן

**Updated:** 2026-05-27 21:13 IDT
**Repo:** `peleg1711-boop/Gezroni`
**Local path in this session:** `/Users/mac/Desktop/Gezroni-dev/Gezroni`
**Current local branch:** `feature/farm-board-static-v1`
**Current intent:** Static farm-board v1 is implemented locally. No backend/DB, no commit, and no push yet.

---

## 1. Product Vision

Gezroni / מהשדה לשולחן is meant to be the gateway between the ordinary Israeli citizen and the Israeli farmer.

This is not only a marketplace. The emotional core is a practical civic movement: help people bypass the expensive retail chain, lower the cost of living, and support local farmers directly. The product should feel like a useful tool and also like a quiet protest against the current food-pricing system.

The user should understand, quickly and viscerally:

- I can buy fresh Israeli produce directly from farmers.
- I can pay less than I would through supermarket chains.
- The farmer gets more of the money.
- This is local, human, Israeli, and grounded in real farms.
- Joining or buying is a small act of protest against יוקר המחיה.

The product tone should be energetic but trustworthy. It should not feel like a generic grocery app or just another polished SaaS dashboard. It should feel like: "fresh food, fair prices, real farmers, direct action."

---

## 2. Core Audience

### Buyers / citizens

Regular Israeli households who want fresh produce, fair pricing, and a way to support farmers directly.

Likely motivations:

- Lower grocery costs.
- Better produce.
- Trust and transparency.
- Supporting Israeli agriculture.
- Feeling part of a practical social movement.

### Farmers / sellers

Israeli farmers who want a direct channel to customers without relying only on middlemen, supermarkets, or wholesalers.

Likely motivations:

- Sell directly at better margins.
- Build a local customer base.
- Manage orders more easily.
- Present the farm as a real, trusted source.

---

## 3. Product Shape

The project is currently a static prototype made from single-file HTML pages. There is no backend yet and no build system.

The intended product has three connected surfaces:

1. **Public landing page**
   Explains the mission, builds trust, shows map/filter discovery, and captures buyer/farmer leads.

2. **Buyer marketplace**
   Lets citizens browse produce by region/category/farmer, add items to cart, and submit a mock order.

3. **Farmer dashboard**
   Lets farmers see activity, manage products, and handle orders.

Right now these surfaces are separate HTML pages. There is no real routing between them yet.

---

## 4. Current Tech Stack

- Vanilla HTML/CSS/JS.
- No framework.
- No build tools.
- No package manager dependency is required to run the app.
- Hebrew RTL throughout.
- Font: Rubik from Google Fonts.
- Google Maps is loaded directly from script tags.
- Data is currently hard-coded in JS arrays and DOM markup.

Run locally with any static server, for example:

```bash
cd /Users/mac/Desktop/Gezroni-dev/Gezroni
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open:

- `http://127.0.0.1:8765/landing%20v6.html`
- `http://127.0.0.1:8765/marketplace.html`
- `http://127.0.0.1:8765/seller-dashboard.html`

Opening the HTML files directly also works for many flows, but a local server is better for QA.

---

## 5. Repository Files

| File | Purpose | Current status |
| --- | --- | --- |
| `landing v6.html` | Public landing page and buyer/farmer lead capture | Visually advanced, but mobile layout currently broken and farmer signup is hidden |
| `marketplace.html` | Buyer-facing marketplace/catalog/cart | Core prototype works, data is mock/static |
| `seller-dashboard.html` | Farmer dashboard for products/orders/profile | Core prototype works, data is mock/static |
| `README.md` | Minimal repo title only | Needs real project README later |
| `HANDOFF.md` | This file | Source of truth for next work |

---

## 6. Current Git Context

- Remote: `https://github.com/peleg1711-boop/Gezroni.git`
- Default branch on GitHub: `main`
- Local working branch prepared for safe work: `work/start`
- Last known commit at time of QA: `491f7b3 Merge feat/crop-picker-ux-enhancements into main`
- Working tree was clean before this handoff update.

Recommended workflow:

1. Keep working on a feature branch.
2. Push only to the feature branch.
3. Open a Draft PR.
4. Merge to `main` only after review.

Do not push directly to `main` unless the user explicitly asks for that.

---

## 7. Design Direction

The current design language is inspired by Deepstash-style UI but adapted to a green agricultural movement.

Core feel:

- Warm cream background.
- Deep green hero sections.
- White cards.
- Pill-shaped controls.
- Springy animation.
- Rich, tactile, optimistic interface.
- Hebrew-first, RTL-first.
- Local Israeli agricultural identity.

Important design tokens already used in the app:

```css
:root {
  --green-900: #1a3a08;
  --green-800: #2D5A1B;
  --green-600: #4a7c29;
  --green-400: #A5D96A;
  --green-100: #F0F7E8;
  --green-50:  #f7fcf2;

  --bg:        #f4f1eb;
  --surface:   #ffffff;
  --dark-card: #1C2B15;
  --text-1:    #1a1a1a;
  --text-2:    #555;
  --text-3:    #999;

  --orange:      #f59e0b;
  --orange-pale: #fef3c7;
  --red:         #ef4444;
  --red-pale:    #fee2e2;

  --spring:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  --r-pill: 999px;
  --r-xl:   24px;
  --r-lg:   20px;
  --r-md:   16px;
  --r-sm:   10px;
}
```

Design should communicate both:

- Practical marketplace utility.
- Social mission against food-price inflation.

Avoid making it feel like a generic startup landing page.

---

## 8. `landing v6.html`

Purpose:

Public entry point for the movement. It should explain the mission, show the farmer network, and let buyers/farmers join.

Current content and behavior:

- Hero section with brand, mission, and value proposition.
- Map section showing launch regions.
- Region pills for עמק חפר, צפון, חיפה, גוש דן, שפלה, ירושלים, נגב.
- Google Maps integration with hard-coded launch-area markers.
- Produce filter panel injected by JS.
- Buyer lead form.
- Farmer lead form exists in the DOM.
- Crop picker has 18 crop cards.
- Confetti on successful form submission.
- Forms currently log mock data and only POST if `WEBHOOK_URL` is configured.

Important current issue:

- The farmer signup CTA is hidden with `style="display:none"`, so regular users cannot reach the farmer form through the visible UI.
- On mobile width around 390px, the landing layout is broken: content is shifted horizontally and the first viewport is mostly blank. The page measured roughly 766px wide in mobile QA.

Current strategic direction:

- Landing must become the clearest expression of the civic/protest mission.
- It should give a citizen a reason to join beyond "fresh vegetables": lowering prices and helping farmers directly.
- It should give farmers a clear reason to join: direct customer demand and fairer margins.

---

## 9. `marketplace.html`

Purpose:

Buyer-facing shopping prototype.

Current content and behavior:

- Header with brand.
- Hero: "תוצרת חקלאית פראית".
- Region filters:
  - כל האזורים
  - עמק חפר
  - דרום השרון
- Category filters:
  - הכל
  - ירקות
  - עלים וירוקים
  - גזרים ושורשים
- Product grid renders 12 hard-coded products.
- Cart badge updates.
- Add to cart works.
- Quantity controls work.
- Cart drawer opens.
- Phone validation exists.
- Checkout success overlay works.
- Map view exists and uses Google Maps.

Current product data:

- Products are hard-coded in `PRODUCTS`.
- Farmers include:
  - משק מלמד (עוז)
  - משק שדה (נטע)
  - משק האורגני (תמר)
  - הגינה של ארז
- Regions include:
  - עמק חפר
  - דרום השרון

Known issue:

- `logo.svg` is referenced but does not exist in the repo, causing a 404 and broken logo image.
- Checkout only logs mock data unless `WEBHOOK_URL` is configured.
- Cart state is not persisted.

QA result:

- Desktop core flow works.
- Mobile at 390px is usable.

---

## 10. `seller-dashboard.html`

Purpose:

Farmer-facing dashboard prototype.

Current screens:

1. Home
   - Dark green hero card.
   - Farmer status.
   - Live ticker.
   - Stats: orders, revenue, views.
   - Revenue chart.
   - Quick actions.
   - Pending order cards.

2. Products
   - Product cards.
   - Active/paused toggles.
   - Add product FAB.
   - Add product modal.
   - Newly added products appear at top of list.

3. Orders
   - Tabs: ממתינות, בטיפול, הושלמו.
   - Approve/reject buttons.
   - Approve updates card badge and pending badge.
   - Reject removes card after animation.

4. Profile
   - Basic farm profile.
   - Several placeholder settings rows.

QA result:

- Desktop core flow works.
- Mobile at 390px is usable.
- Add product works.
- Approve order works.

Known issue:

- Product added via modal is DOM-only and disappears on reload.
- `addProduct()` builds DOM using `innerHTML` with user input, which is acceptable for a quick prototype but should be made safer before real use.
- Many clickable elements are `div`s without real button semantics.

---

## 11. QA Summary From 2026-05-27

QA was run read-only against a local static server.

Verified flows:

- Landing buyer signup opens, accepts name/contact, shows success and confetti.
- Landing map/region pills update visible region state.
- Marketplace renders product grid.
- Marketplace region/category filters work.
- Marketplace add-to-cart and quantity changes work.
- Marketplace cart drawer opens and checkout success appears.
- Seller dashboard tab navigation works.
- Seller dashboard add-product modal works.
- Seller dashboard order approval works.

Main findings:

1. Landing mobile layout is broken.
2. Farmer registration is present but not reachable.
3. No real persistence or backend exists.
4. Marketplace logo asset is missing.
5. Google Maps keys are hard-coded.
6. Google Maps console warns about loading style and deprecated `google.maps.Marker`.
7. Accessibility is prototype-level.
8. Several dynamic DOM insertions use raw `innerHTML`.
9. No automated tests exist.

---

## 12. Accessibility Notes

This app is RTL and visually strong, but accessibility needs a deliberate pass.

Known patterns to improve later:

- Clickable `div`s should become real `button`s or get role/tabindex/keyboard handling.
- Inputs have nearby labels, but many are not connected with `for`/`id`.
- Icon-only controls need accessible names.
- Modals/drawers need focus trapping and escape behavior.
- Toasts/success states should be announced to assistive tech.
- Motion should consistently respect `prefers-reduced-motion`.

Do not prioritize this before the landing mobile/farmer-signup fix unless the user asks.

---

## 13. Data / Backend Status

There is no backend.

Current data behavior:

- Landing lead forms build a data object and log it.
- Marketplace checkout builds an order object and logs it.
- If `WEBHOOK_URL` is set, forms attempt to POST with `mode: 'no-cors'`.
- Seller dashboard data is static/DOM-only.

Possible future backend/data choices:

1. Google Sheets via Apps Script webhook
   - Fastest for collecting leads/orders.
   - Good for prototype and pilot.

2. Supabase
   - Better if the app needs real querying, auth, dashboards, and persistence.

3. Airtable
   - Good admin UI, less flexible long term.

Likely first real-data milestone:

- Capture buyer leads.
- Capture farmer leads.
- Capture farmer listing drafts.
- Store timestamp, region, contact, selected crops/products, listing fields, and source page.

---

## 14. Suggested Next Work

Do not start these until the user explicitly asks.

Priority order:

1. Decide first persistence layer.
2. Connect lead and listing forms to real data.
3. Add real navigation between landing, marketplace, and dashboard.
4. Improve semantic buttons and accessibility.
5. Expand static farm data into the future DB seed shape.
6. Write a proper README.

---

## 15. Product Messaging Notes

Potential Hebrew message pillars:

- "שוברים את יוקר המחיה מהשורש."
- "קונים ישירות מהחקלאי. משלמים פחות. משאירים יותר אצל מי שגידל."
- "בלי סופרמרקט, בלי פערי תיווך, בלי משחקים."
- "תוצרת ישראלית, מחיר הוגן, קשר ישיר."
- "מחאה שאפשר לאכול ממנה."

Tone guidelines:

- Direct and warm.
- Israeli, local, practical.
- Not too corporate.
- Not too aggressive.
- The protest should feel constructive: building a better path, not only complaining about the old one.

---

## 16. Static Farm Board V1 Implemented

Implemented locally on `feature/farm-board-static-v1`:

- Home remains `landing v6.html`, preserving the green hero, copy, and farmer silhouette.
- The farm board is embedded below the home hero via `marketplace.html?embedded=1`, so the map/card/filter features stay in one maintained implementation.
- The large farmer/citizen signup sections are no longer part of the active home flow; the top of the home hero has compact "אזרח" and "חקלאי" buttons.
- Marketplace is now a farm board rendered from a `FARMS` data model.
- Farm cards show farm, farmer, produce, prices, location, availability, tags, and last update.
- Filters cover region, produce category, price, availability, and tags.
- Farm details modal exposes full prices and contact options.
- Clicking a farm focuses it on the map with smooth pan/zoom and a richer map info card.
- Seller dashboard is now a static farm-listing management demo.
- Listing and produce drafts use localStorage keys prepared for future DB/API replacement.
- Missing marketplace logo is replaced by an inline fallback mark.
- Smoke tested at 390px, 768px, and desktop with no horizontal overflow.

---

## 17. Working Rules For Future Agents

- Do not change code until the user explicitly asks.
- Before edits, check `git status --short --branch`.
- Preserve user changes.
- Work on `work/start` or a new feature branch.
- Do not push to `main` directly.
- Keep project static unless the user approves a framework/backend.
- Prefer small, focused changes.
- Verify in desktop and mobile browser after UI edits.
- For frontend QA, test at least:
  - Desktop 1280x720.
  - Mobile 390x844.
  - Landing first viewport.
  - Farmer signup.
  - Marketplace farm filters and farm details modal.
  - Dashboard listing draft save and add produce flow.

---

## 18. Current Session Notes

- The user asked first to prepare the repo safely on the Desktop.
- The repo was cloned into `/Users/mac/Desktop/Gezroni-dev/Gezroni`.
- A local branch `work/start` was created.
- A full read-only QA and product analysis was performed.
- Implementation later moved to `feature/farm-board-static-v1`.
- Static farm-board changes are local only; nothing has been committed or pushed.
