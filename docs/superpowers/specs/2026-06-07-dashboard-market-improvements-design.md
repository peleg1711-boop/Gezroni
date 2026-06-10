# Dashboard & Market Improvements — Design Spec
**Date:** 2026-06-07  
**Status:** Approved

---

## Scope

Five improvements across the farmer dashboard and public market pages.

---

## 1. Products Page Layout Fix + FAB Position

**Problem:** The `#screen-products` page looks broken when the product list is empty (no empty state). The FAB button uses `right: calc(50% - 215px + 16px)` which mispositions on non-mobile viewports.

**Fix:**
- Add an empty-state card inside `#products-list` when `dashProducts.length === 0`: big icon, "עוד לא הוספת תוצרת" headline, and a large "הוסף תוצרת ראשונה ←" button that opens the add-product modal.
- Replace FAB CSS position formula with `right: 16px` — simple, always bottom-right above the nav bar.

---

## 2. Farm Hero Image Upload → Syncs to Status-Card

**Profile tab:** Replace static `🌾` emoji avatar with a tappable upload zone — large camera icon + "שנה תמונה" label (44px+ tap target, obvious for 60+ farmers). On image pick:
1. Store base64 in `localStorage` key `gezroni:farm-hero-image`.
2. Display immediately in `profile-hero` as a `background-image`.
3. If logged in, upload to Supabase `farm-images` bucket (`is_primary: true`).

**Source priority on load:** Supabase primary image URL (if logged in) → localStorage base64 → original green gradient.

**Status-card (home tab):** Reads the same resolved image URL and applies it as `background-image` with low opacity (≈0.22) overlay on the dark card. Text stays centered over it.

---

## 3. Farm Detail Full-Page Overlay (replaces modal sheet)

Clicking "פרטים מלאים" opens a `position:fixed; inset:0` overlay (z-index 200). No URL change.

**Content layout (top → bottom):**
- Hero image: full-width, 200px tall, gradient fade at bottom. Falls back to green gradient if no image.
- Farm name (large, bold) + region/city subtitle
- Story / description paragraph
- Working hours section
- Pickup / directions section
- Produce list: every item with price and unit
- Two large contact buttons: WhatsApp (primary green) + Phone number

**Behaviour:** Slides up from bottom on open, slides down on close. `×` close button top-right. Closes on backdrop tap.

---

## 4. Per-Product Image Upload (expandable edit panel)

**Dashboard product card:** Add "עריכה ▾" button (44px+ tap target) to the right side of each product card. Tapping expands a panel beneath with two large explicit buttons:
- **📷 העלה תמונה למוצר** — triggers file input
- **🗑️ מחק מוצר** — deletes with confirmation

**Image storage (hybrid):**
1. On pick: resize/compress client-side if needed, store base64 in `localStorage` keyed by `gezroni:product-image:{product.id}`. Display immediately.
2. If logged in: upload to Supabase `produce-images` bucket, store public URL back into the product object and persist.

**Market `product-visual`:** If a produce item has an `image_url` (Supabase) or a matching `localStorage` key has a base64, render an `<img>` filling the visual area. Otherwise fall back to catalog emoji. This applies to both the market farm cards and the farm detail overlay produce list.

**Dashboard product card emoji:** Same logic — show uploaded image in place of catalog emoji if one exists.

---

## 5. Carousel Speeds

All carousels slowed for 60+ year old farmers:

| Carousel | Before | After |
|---|---|---|
| Dashboard marquee (`marquee-track`) | 20s | 45s |
| Market farm marquee (`farm-marquee-track`) | 32s | 55s |
| Deals carousel (`deals-track`) | JS scroll | 60% slower scroll speed |

---

## Data Model Notes

- No new Supabase tables needed for farm hero (reuses `farm_images` with `is_primary`).
- Product images: add `image_url` field to the product object (both in-memory and persisted to `produce` table in Supabase). New Supabase storage bucket: `produce-images`.
- localStorage keys: `gezroni:farm-hero-image`, `gezroni:product-image:{id}`.

---

## Non-Goals

- No changes to auth flow
- No changes to map functionality
- No changes to admin panel
