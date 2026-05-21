# Handoff — מהשדה לשולחן (From the Field to the Table)
**Date:** 2026-05-21 | **Handed off to:** Antigravity 2.0

---

## 1. Project Overview

Israeli agricultural marketplace connecting farmers directly to consumers.  
**Brand name:** מהשדה לשולחן  
**Stack:** Vanilla HTML/CSS/JS — zero build step, zero frameworks, single-file pages.  
**Language:** Hebrew, full RTL (`dir="rtl"`, `direction:rtl` everywhere).  
**Font:** Rubik (Google Fonts, weights 400–900).  
**Google Maps API key:** `AIzaSyBXsYBu5bML-Egery9Qa4KJNkOuSJiC2fA`

---

## 2. Files in `E:\Gezroni\`

| File | Status | Purpose |
|------|--------|---------|
| `landing v6.html` | Done — needs Deepstash redesign | Public landing page (farmer + buyer registration) |
| `seller-dashboard.html` | Done (Deepstash rebuild complete) | Farmer/seller management UI |
| `HANDOFF.md` | This file | Context for next session |

### Git
- Remote: `peleg1711-boop/Gezroni` on GitHub
- Branch `main` is the active branch
- Open PR: `feat/crop-picker-ux-enhancements` → main (crop picker + scroll animations)

---

## 3. Design System — "Deepstash × Gezroni"

All design decisions are inspired by **deepstash.com** applied to a green agricultural brand.

### CSS Design Tokens (paste into any new file)
```css
:root {
  /* Brand greens */
  --green-900: #1a3a08;
  --green-800: #2D5A1B;
  --green-600: #4a7c29;
  --green-400: #A5D96A;
  --green-100: #F0F7E8;
  --green-50:  #f7fcf2;

  /* Neutrals */
  --bg:        #f4f1eb;   /* warm cream — brand background */
  --surface:   #ffffff;
  --dark-card: #1C2B15;   /* dark green hero sections */
  --text-1:    #1a1a1a;
  --text-2:    #555;
  --text-3:    #999;

  /* Accents */
  --orange:      #f59e0b;
  --orange-pale: #fef3c7;
  --red:         #ef4444;
  --red-pale:    #fee2e2;

  /* Deepstash spring easing — use on all transitions */
  --spring:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  /* Radii */
  --r-pill: 999px;
  --r-xl:   24px;
  --r-lg:   20px;
  --r-md:   16px;
  --r-sm:   10px;
}
```

### Key Keyframes (copy into any new page)
```css
@keyframes shine {
  0%   { background-position: 200% center }
  100% { background-position: -200% center }
}
@keyframes loop-scroll {
  0%   { transform: translateX(0) }
  100% { transform: translateX(-50%) }
}
@keyframes shimmerBg {
  0%   { background-position: 200% 0 }
  100% { background-position: -200% 0 }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(165,217,106,0.5) }
  50%       { box-shadow: 0 0 0 10px rgba(165,217,106,0) }
}
@keyframes floatUp {
  from { opacity: 0; transform: translateY(18px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes toastSlide {
  from { opacity: 0; transform: translateX(-50%) translateY(16px) }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) }
}
@keyframes badgePop {
  0%   { transform: scale(0) }
  60%  { transform: scale(1.25) }
  100% { transform: scale(1) }
}
```

### Core UI Patterns

**Dark hero card** (used on seller dashboard home):
```css
.hero-card {
  background: var(--dark-card);  /* #1C2B15 */
  border-radius: var(--r-xl);    /* 24px */
  color: #fff;
}
.hero-card .title {
  background: linear-gradient(90deg, #fff 0%, var(--green-400) 40%, #fff 60%, #e8f8d0 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 4s linear infinite;
}
```

**Shimmer CTA button:**
```css
.btn-shine {
  background: linear-gradient(90deg, var(--green-800) 0%, var(--green-600) 40%, var(--green-400) 60%, var(--green-800) 100%);
  background-size: 200% auto;
  animation: shimmerBg 3s linear infinite;
  border-radius: var(--r-pill);
  color: #fff;
}
```

**Infinite marquee** (Deepstash activity feed pattern):
```css
.marquee-track {
  display: flex; gap: 10px; width: max-content;
  animation: loop-scroll 22s linear infinite;
}
.marquee-wrap:hover .marquee-track { animation-play-state: paused; }
```
```js
// KEY: double the array so translateX(-50%) lands at identical visual start
var doubled = ITEMS.concat(ITEMS);
```

**Nav pill indicator** (Deepstash bottom nav):
```css
.nav-indicator {
  position: absolute; top: 0; left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 24px; height: 3px;
  border-radius: var(--r-pill);
  background: var(--green-800);
  transition: transform 0.35s var(--spring);
}
.nav-item.active .nav-indicator { transform: translateX(-50%) scaleX(1); }
```

**Counter animation** (rAF cubic ease-out):
```js
function animateCounter(el, from, to, prefix, suffix, duration) {
  var start = null;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / duration, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (prefix||'') + Math.round(from + (to - from) * eased) + (suffix||'');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

**Stat card 3D tilt hover:**
```css
.stat-card {
  transition: transform 0.35s var(--spring), box-shadow 0.3s ease;
  transform-style: preserve-3d;
  perspective: 600px;
}
.stat-card:hover  { transform: translateY(-5px) rotateX(4deg); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
.stat-card:active { transform: scale(0.93); }
```

**Live ticker** (fake real-time):
```js
setInterval(function() {
  tickerIdx = (tickerIdx + 1) % TICKER_EVENTS.length;
  // fade out → update content → fade in
}, 4000);
```

---

## 4. `seller-dashboard.html` — What's Built

4 screens, RTL Hebrew, full Deepstash animation system.

### Screen: בית (Home)
- Fixed top header (logo + notification bell)
- Dark green hero card — farmer name with shine animation, location, farm status badge, "פרופיל פעיל" pill button
- LIVE ticker — rotates every 4s through fake order/review events with fade transition
- Stat cards row — 3 cards (צפיות/הכנסות השבוע/הזמנות היום) with count-up on load, 3D tilt hover
- 7-day revenue bar chart (CSS bars, no library)
- Quick actions row (הזמנות + הוסף מוצר CTA with shimmerBg)

### Screen: הזמנות (Orders)
- Pill tab bar — ממתינות / בטיפול / הושלמו
- Order cards — customer name, time, location, itemized list with emojis, price, אשר/דחה buttons

### Screen: מוצרים (Products)
- Product list — name, minimum order, price/unit, active status toggle switch
- Floating + FAB to add new product (rotates 45° on hover)

### Screen: פרופיל (Profile)
- Basic farmer profile display

### Bottom Nav
- 4 items: בית / הזמנות (badge 2) / מוצרים / פרופיל
- Spring pill indicator at top of active item
- `screenIn` animation (opacity + translateY) on tab switch

### Toast system
```js
function showToast(msg, type) { /* pill shape, toastSlide animation, auto-dismiss 3s */ }
```

---

## 5. `landing v6.html` — What's Built

### Sections
1. Sticky nav with mobile hamburger
2. Hero section with animated tagline
3. Farmer registration form (section id: `farmer`)
4. Buyer registration form (section id: `buyer`)
5. How it works
6. Social proof / testimonials
7. Footer

### Farmer Form Fields
- שם מלא (`f-name`)
- טלפון (`f-phone`)
- אזור (`f-region`) — dropdown
- מה גדל אצלך? — **visual crop picker** (Netflix-style, replaces old text input)
- Google Maps location picker

### Crop Picker (already implemented)
```html
<div class="crop-grid" id="crop-grid">
  <div class="crop-card" onclick="toggleCrop(this,'עגבניות')">
    <span class="crop-emoji">🍅</span><span class="crop-name">עגבניות</span>
  </div>
  <!-- 17 crops total -->
</div>
<input type="hidden" id="f-crop">
```
```js
var selectedCrops = [];
function toggleCrop(el, name) {
  var idx = selectedCrops.indexOf(name);
  if (idx === -1) { selectedCrops.push(name); el.classList.add('selected'); }
  else { selectedCrops.splice(idx, 1); el.classList.remove('selected'); }
  document.getElementById('f-crop').value = selectedCrops.join(', ');
}
```

### Enhancements already added (in PR)
- Scroll progress bar (fixed top, green fill)
- IntersectionObserver scroll-reveal (`floatUp` on sections)
- Animated counter for social proof numbers
- Sticky CTA banner (shows after 40% scroll)
- Confetti on successful form submission

### Forms currently don't send data
Both `submitForm('farmer')` and `submitForm('buyer')` show a success UI but don't POST anywhere. **Real data collection is not yet connected.**

---

## 6. NEXT TASKS (priority order)

### [HIGHEST] Redesign `landing v6.html` with Deepstash style
Apply **exactly the same visual language** as the seller dashboard:
- Warm cream background (`#f4f1eb`)
- Dark hero section (`#1C2B15`) with shine text animation
- Card radius 24px everywhere
- Spring easing on all hover/scroll interactions
- Shimmer CTA buttons
- Marquee for social proof / featured farmers
- Pill-shaped tags and badges
- Same CSS variables and keyframes as dashboard

Keep all existing functionality (crop picker, maps, forms, confetti).  
The file is large (~190K chars) — use Grep to find sections before editing, avoid reading the whole file.

### [HIGH] Connect forms to real data
Options (user hasn't decided yet):
- **Google Sheets** via Apps Script webhook (easiest, no auth)
- **Supabase** (better for querying later)
- **Airtable** REST API

Endpoint should receive: name, phone, region, crops (comma-separated), lat/lng.

### [MEDIUM] Add product modal in seller dashboard
The FAB (+) on products screen should open a slide-up modal with fields:
- שם המוצר, מחיר לק"ג, מינימום הזמנה, קטגוריה, תיאור קצר
- A toggle: "זמין עכשיו"

### [MEDIUM] Make orders actionable end-to-end
- "אשר" button → moves card to בטיפול tab + shows toast
- "דחה" → shows confirmation dialog → moves to הושלמו with rejected state

### [LOW] Profile screen content
Currently placeholder. Should show: farm name, location, active crops, rating, edit button.

---

## 7. Code Conventions to Follow

- **No frameworks, no build tools.** Pure HTML/CSS/JS in a single file.
- **RTL everywhere.** `dir="rtl"` on `<html>`, `direction:rtl` in CSS, text-align defaults to right.
- **Use `var(--spring)` on every transition** — never `ease`, never raw `cubic-bezier` inline.
- **Border radius:** cards = `var(--r-xl)` (24px), buttons = `var(--r-pill)` (999px), tags = `var(--r-sm)` (10px).
- **No emoji as icons** — use inline SVG for UI icons. Emoji allowed in content (crop names, status indicators).
- **Comments** only when the WHY is non-obvious.
- **Accessibility:** `prefers-reduced-motion` override on all animations (already set in dashboard).

---

## 8. Running Locally

```
cd E:\Gezroni
npx serve . -l 3456
# then open http://localhost:3456/seller-dashboard.html
# or open http://localhost:3456/landing%20v6.html
```

No `.env`, no secrets file needed for UI-only work. Google Maps key is hard-coded in `landing v6.html`.
