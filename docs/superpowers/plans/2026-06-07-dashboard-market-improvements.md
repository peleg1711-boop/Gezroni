# Dashboard & Market Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five targeted improvements: fix broken products layout, add farm hero image upload (synced to status-card), replace the farm detail modal with a full-page overlay, add per-product image upload with localStorage+Supabase hybrid storage, and slow all carousels for 60+ year old farmers.

**Architecture:** All changes are in three vanilla-JS files (`dashboard.js`, `market.js`, `farm-card.js`) and one CSS file (`screens.css`). Images use a hybrid strategy: base64 in `localStorage` for immediate display and guest users, uploaded to Supabase storage for logged-in users with the public URL stored back on the record. No new files are created.

**Tech Stack:** Vanilla JS (ES modules), Supabase JS v2 (auth + storage + DB), CSS custom properties, localStorage.

---

## File Map

| File | What changes |
|---|---|
| `src/styles/screens.css` | FAB position fix; carousel speeds; hero-bg-img styles; profile-hero upload zone; product edit panel; farm detail full-page overlay styles |
| `src/screens/dashboard.js` | Products empty state; hero image upload + apply to status-card + profile-hero; product edit/delete panel; product image upload; DB read/write for `image_url`; new `PRODUCT_IMAGE_KEY_PREFIX` constant |
| `src/screens/market.js` | Full-page farm detail overlay replaces bottom sheet |
| `src/components/farm-card.js` | `thumbImage.src` prefers `produce[0].image_url` |

---

## Task 1: Slow all carousels

**Files:**
- Modify: `src/styles/screens.css` (lines ~1132, ~1692, ~2826)

- [ ] **Step 1: Update three animation durations in screens.css**

Find and replace these three lines (use the Edit tool — each is a unique string):

```css
/* line ~1132 — market farm marquee */
/* OLD: */ animation: farm-marquee 32s linear infinite;
/* NEW: */ animation: farm-marquee 55s linear infinite;

/* line ~1692 — deals carousel */
/* OLD: */ animation: deals-scroll 36s linear infinite;
/* NEW: */ animation: deals-scroll 60s linear infinite;

/* line ~2826 — dashboard activity marquee */
/* OLD: */ animation:loop-scroll 22s linear infinite;
/* NEW: */ animation:loop-scroll 45s linear infinite;
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/screens.css
git commit -m "fix: slow all carousels to 45-60s for 60+ year old farmers"
```

---

## Task 2: Fix FAB position + add products empty state

**Files:**
- Modify: `src/styles/screens.css` (`.fab` rule, ~line 3048; add `.products-empty-state`)
- Modify: `src/screens/dashboard.js` (`renderProducts`, add `buildEmptyProductsState`)

- [ ] **Step 1: Fix FAB CSS — change right position**

In `src/styles/screens.css`, find this line inside `.fab`:
```css
  right:calc(50% - 215px + 16px);
```
Replace with:
```css
  right:16px;
```

- [ ] **Step 2: Add empty state CSS at end of dashboard section in screens.css**

After the `.fab` rule block (after line ~3059), add:
```css
/* ══ PRODUCTS EMPTY STATE ══ */
.products-empty-state{
  text-align:center;padding:48px 24px 32px;
  display:flex;flex-direction:column;align-items:center;gap:12px;
}
.products-empty-icon{font-size:52px;line-height:1;margin-bottom:4px}
.products-empty-title{font-size:18px;font-weight:800;color:var(--text-1)}
.products-empty-sub{font-size:14px;color:var(--text-3);max-width:240px;line-height:1.5}
```

- [ ] **Step 3: Add `buildEmptyProductsState` function in dashboard.js**

Add this function just before `renderProducts()` (around line 757):
```js
function buildEmptyProductsState() {
  const el = document.createElement('div');
  el.className = 'products-empty-state';
  el.innerHTML = `
    <div class="products-empty-icon">🌾</div>
    <div class="products-empty-title">עוד לא הוספת תוצרת</div>
    <div class="products-empty-sub">הוסף פריטים ותמחורים שיוצגו בלוח המשקים</div>
    <button class="btn-shine" id="empty-add-product" type="button" style="margin-top:8px">הוסף תוצרת ראשונה ←</button>
  `;
  el.querySelector('#empty-add-product').addEventListener('click', openAddProductModal);
  return el;
}
```

- [ ] **Step 4: Update `renderProducts()` to show empty state**

Find `renderProducts()` in dashboard.js. Replace the body with:
```js
function renderProducts() {
  const list = document.getElementById('products-list');
  const count = document.getElementById('products-count');
  if (!list) return;
  list.innerHTML = '';
  if (dashProducts.length === 0) {
    list.appendChild(buildEmptyProductsState());
    if (count) count.textContent = '0 פריטים';
    updateStats(false);
    return;
  }
  dashProducts.forEach(p => list.appendChild(buildProductCard(p)));
  const active = dashProducts.filter(p => p.active).length;
  if (count) count.textContent = active + ' פעילים מתוך ' + dashProducts.length;
  updateStats(false);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/screens.css src/screens/dashboard.js
git commit -m "fix: FAB position to bottom-right, add products empty state"
```

---

## Task 3: Supabase migration — add image_url to produce table

**Files:** No JS/CSS changes — Supabase schema only.

- [ ] **Step 1: Add `image_url` column to `produce` table via Supabase MCP**

Use the `execute_sql` MCP tool with this SQL:
```sql
ALTER TABLE produce ADD COLUMN IF NOT EXISTS image_url text;
```

- [ ] **Step 2: Create `produce-images` storage bucket via Supabase MCP**

Use the Supabase dashboard or MCP to create a public bucket named `produce-images`. If using `execute_sql` is not available for bucket creation, create it via the Supabase dashboard → Storage → New bucket → name: `produce-images`, public: true.

- [ ] **Step 3: Commit (note the migration)**

```bash
git commit --allow-empty -m "chore: apply Supabase migration — produce.image_url column + produce-images bucket"
```

---

## Task 4: Farm hero image upload in profile tab

**Files:**
- Modify: `src/screens/dashboard.js` (buildShell, new functions)
- Modify: `src/styles/screens.css` (hero-bg-img, hero-upload-zone styles)

- [ ] **Step 1: Add CSS for hero background image layer and upload zone**

Add after the `.profile-hero` rule block in `src/styles/screens.css`:
```css
/* ══ HERO BG IMAGE LAYER ══ */
.hero-bg-img{
  position:absolute;inset:0;
  background-size:cover;background-position:center;
  opacity:0.26;pointer-events:none;z-index:0;border-radius:inherit;
}
.status-card>.hero-bg-img,.profile-hero>.hero-bg-img{z-index:0}
.status-card>*:not(.hero-bg-img),.profile-hero>*:not(.hero-bg-img){
  position:relative;z-index:1;
}

/* ══ HERO UPLOAD ZONE ══ */
.hero-upload-zone{
  display:inline-flex;flex-direction:column;align-items:center;gap:6px;
  cursor:pointer;margin-bottom:4px;
}
.hero-upload-icon{
  width:64px;height:64px;border-radius:50%;
  background:rgba(255,255,255,0.15);
  border:2px solid rgba(255,255,255,0.3);
  display:flex;align-items:center;justify-content:center;
  transition:background 0.2s;
}
.hero-upload-zone:hover .hero-upload-icon{background:rgba(255,255,255,0.25)}
.hero-upload-icon svg{width:28px;height:28px;stroke:#fff}
.hero-upload-label{
  font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:0.3px;
}
```

- [ ] **Step 2: Update profile-hero HTML in `buildShell()` in dashboard.js**

Find this block inside `buildShell()`:
```js
    <div class="profile-hero">
        <div class="avatar">🌾</div>
        <div class="profile-name" id="profile-name">
```
Replace with:
```js
    <div class="profile-hero" id="profile-hero">
        <div class="hero-bg-img" id="profile-hero-bg" aria-hidden="true"></div>
        <label class="hero-upload-zone" for="hero-photo-input" aria-label="שנה תמונת משק">
          <div class="hero-upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span class="hero-upload-label">שנה תמונה</span>
          <input type="file" id="hero-photo-input" accept="image/jpeg,image/png,image/webp" style="display:none">
        </label>
        <div class="profile-name" id="profile-name">
```

- [ ] **Step 3: Add `hero-bg-img` div to status-card HTML in `buildShell()`**

Find:
```js
      <div class="status-card">
        <div class="status-greeting">ניהול מודעת המשק</div>
```
Replace with:
```js
      <div class="status-card">
        <div class="hero-bg-img" id="status-card-bg" aria-hidden="true"></div>
        <div class="status-greeting">ניהול מודעת המשק</div>
```

- [ ] **Step 4: Add hero image constants and functions in dashboard.js**

Add these after the existing `PRODUCTS_KEY` constant (around line 14):
```js
const FARM_HERO_KEY = 'gezroni:farm-hero-image';
const PRODUCT_IMAGE_KEY_PREFIX = 'gezroni:product-image:';
```

Add these new functions after `initPhotoUpload()` at the bottom of the file:
```js
// ─── hero image ───────────────────────────────────────────────────────────────
function applyHeroImage(url) {
  if (!url) return;
  const heroBg = document.getElementById('profile-hero-bg');
  const statusBg = document.getElementById('status-card-bg');
  if (heroBg) heroBg.style.backgroundImage = `url("${url}")`;
  if (statusBg) statusBg.style.backgroundImage = `url("${url}")`;
}

async function resolveHeroImage() {
  // Prefer Supabase primary image for logged-in users
  if (currentUser) {
    const db = getDb();
    if (db) {
      const farmId = 'farm-' + currentUser.id.slice(0, 8);
      const { data } = await db.from('farm_images')
        .select('storage_path')
        .eq('farm_id', farmId)
        .eq('is_primary', true)
        .maybeSingle();
      if (data?.storage_path) {
        const url = db.storage.from('farm-images').getPublicUrl(data.storage_path).data?.publicUrl;
        if (url) { applyHeroImage(url); return; }
      }
    }
  }
  // Fall back to localStorage base64
  const cached = localStorage.getItem(FARM_HERO_KEY);
  if (cached) applyHeroImage(cached);
}

async function handleHeroPhotoInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('התמונה גדולה מ-5MB', 'warning'); e.target.value = ''; return; }

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result;
    try { localStorage.setItem(FARM_HERO_KEY, base64); } catch {}
    applyHeroImage(base64);
    showToast('תמונה נשמרה ✓', 'success');

    // Upload to Supabase if logged in
    if (currentUser) {
      const db = getDb();
      if (!db) return;
      const farmId = await ensureFarmExists(db);
      const ext = file.name.split('.').pop().toLowerCase().replace('jpg', 'jpeg') || 'jpeg';
      const mime = ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
      const path = `${currentUser.id}/hero.${ext}`;
      const { error: upErr } = await db.storage.from('farm-images').upload(path, file, { contentType: mime, upsert: true });
      if (upErr) return;
      // Mark as primary in DB
      await db.from('farm_images').upsert({ farm_id: farmId, storage_path: path, is_primary: true }, { onConflict: 'farm_id,storage_path' });
      // Remove old primary flags
      await db.from('farm_images').update({ is_primary: false }).eq('farm_id', farmId).neq('storage_path', path);
      const url = db.storage.from('farm-images').getPublicUrl(path).data?.publicUrl;
      if (url) { applyHeroImage(url); showToast('תמונה הועלתה לענן ✓', 'success'); }
    }
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function initHeroUpload() {
  document.getElementById('hero-photo-input')?.addEventListener('change', handleHeroPhotoInput);
  resolveHeroImage();
}
```

- [ ] **Step 5: Call `initHeroUpload()` from `mountDashboard()`**

In `mountDashboard()`, after `initPhotoUpload();` add:
```js
  initHeroUpload();
```

Also call `resolveHeroImage()` after a successful login in `handleAuthSubmit()`, inside the `if (authMode === 'login')` block, after `loadFarmPhotos()`:
```js
      resolveHeroImage();
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/dashboard.js src/styles/screens.css
git commit -m "feat: farm hero image upload with localStorage+Supabase sync, synced to status-card"
```

---

## Task 5: Farm detail full-page overlay

**Files:**
- Modify: `src/styles/screens.css` (`.farm-modal-overlay`, `.farm-modal-sheet`, add farm-detail styles)
- Modify: `src/screens/market.js` (`openFarmModal`)

- [ ] **Step 1: Update `.farm-modal-overlay` CSS to full-screen (no backdrop)**

Find in `src/styles/screens.css`:
```css
.farm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
```
Replace with:
```css
.farm-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--surface);
  z-index: 100;
  display: flex;
  align-items: stretch;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}
```

- [ ] **Step 2: Update `.farm-modal-sheet` CSS to fill screen**

Find:
```css
.farm-modal-sheet {
  background: var(--surface);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  padding: 1.25rem;
  width: 100%;
  max-width: 430px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s var(--spring);
}
```
Replace with:
```css
.farm-modal-sheet {
  background: var(--surface);
  border-radius: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transform: translateY(100%);
  transition: transform 0.3s var(--spring);
}
```

- [ ] **Step 3: Add farm-detail CSS classes after `.farm-modal-body` rule**

Add these styles after the `.farm-modal-body` block:
```css
/* ══ FARM DETAIL FULL PAGE ══ */
.farm-detail-hero{
  position:relative;width:100%;height:220px;flex-shrink:0;
  background:var(--green-800) center/cover;
  display:flex;flex-direction:column;justify-content:flex-end;
}
.farm-detail-hero::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.65) 100%);
  pointer-events:none;
}
.farm-detail-hero-content{
  position:relative;z-index:1;padding:16px 18px 20px;
}
.farm-detail-name{
  font-size:22px;font-weight:900;color:#fff;margin-bottom:4px;
}
.farm-detail-sub{font-size:13px;color:rgba(255,255,255,0.8);font-weight:600}
.farm-detail-close{
  position:absolute;top:14px;right:14px;z-index:2;
  width:40px;height:40px;border-radius:50%;
  background:rgba(0,0,0,0.4);border:none;
  color:#fff;font-size:22px;line-height:1;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
.farm-detail-body{
  flex:1;padding:20px 18px 40px;display:flex;flex-direction:column;gap:18px;
  overflow-y:auto;
}
.farm-detail-section h3{
  font-size:12px;font-weight:800;color:var(--green-800);
  text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;
}
.farm-detail-section p{
  font-size:14px;color:var(--text-2);line-height:1.6;margin:0;
}
.farm-detail-produce-list{display:flex;flex-direction:column;gap:8px}
.farm-detail-produce-row{
  display:flex;align-items:center;gap:10px;
  padding:10px 12px;background:var(--green-50);
  border-radius:var(--r-md);
}
.farm-detail-produce-img{
  width:36px;height:36px;object-fit:contain;flex-shrink:0;
}
.farm-detail-produce-name{flex:1;font-size:14px;font-weight:700;color:var(--text-1)}
.farm-detail-produce-price{font-size:14px;font-weight:900;color:var(--green-800)}
.farm-detail-actions{
  display:flex;gap:10px;margin-top:4px;
}
.farm-detail-actions .farm-action-btn{
  flex:1;min-height:52px;font-size:16px;font-weight:800;border-radius:var(--r-pill);
  cursor:pointer;border:none;
}
```

- [ ] **Step 4: Rewrite `openFarmModal(farm)` in market.js**

Find `openFarmModal(farm)` in `src/screens/market.js` (around line 716). Replace the entire function with:

```js
function openFarmModal(farm) {
  const overlay = document.getElementById('farm-modal-overlay');
  const sheet = overlay?.querySelector('.farm-modal-sheet');
  if (!overlay || !sheet) return;

  const produce = farm.produce || [];
  const contact = farm.contact || {};
  const waNum = (contact.whatsapp || contact.phone || '').replace(/\D/g, '');
  const waLink = waNum ? `https://wa.me/${waNum}` : null;
  const phoneLink = contact.phone ? `tel:${contact.phone}` : null;

  // Resolve hero image: prefer farm primary image URL if available on the data
  const heroUrl = farm.hero_image_url || farm.heroImageUrl || '';

  sheet.innerHTML = `
    <div class="farm-detail-hero" style="${heroUrl ? `background-image:url('${escapeHtml(heroUrl)}')` : ''}">
      <button class="farm-detail-close" id="farm-detail-close-btn" type="button" aria-label="סגור">×</button>
      <div class="farm-detail-hero-content">
        <div class="farm-detail-name">${escapeHtml(farm.name)}</div>
        <div class="farm-detail-sub">${escapeHtml([farm.farmer_name || farm.farmerName, farm.region, farm.city].filter(Boolean).join(' · '))}</div>
      </div>
    </div>
    <div class="farm-detail-body">
      ${farm.story ? `<div class="farm-detail-section"><h3>על המשק</h3><p>${escapeHtml(farm.story)}</p></div>` : ''}
      ${farm.working_hours?.text || farm.hours ? `<div class="farm-detail-section"><h3>שעות פעילות</h3><p style="white-space:pre-line">${escapeHtml(farm.working_hours?.text || farm.hours)}</p></div>` : ''}
      ${farm.pickup || farm.directions ? `<div class="farm-detail-section"><h3>איסוף והגעה</h3>${farm.pickup ? `<p>📍 ${escapeHtml(farm.pickup)}</p>` : ''}${farm.directions ? `<p style="margin-top:6px">🗺️ ${escapeHtml(farm.directions)}</p>` : ''}</div>` : ''}
      ${produce.length ? `
        <div class="farm-detail-section">
          <h3>תוצרת זמינה</h3>
          <div class="farm-detail-produce-list">
            ${produce.map(p => {
              const imgSrc = p.image_url || getProduceImageSrc(p);
              const alt = getProduceAlt(p);
              const price = Number(p.price);
              return `<div class="farm-detail-produce-row">
                <img class="farm-detail-produce-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.style.display='none'">
                <span class="farm-detail-produce-name">${escapeHtml(p.name)}${p.availability ? ` <span style="font-size:11px;background:var(--green-100);color:var(--green-800);padding:2px 7px;border-radius:20px;font-weight:800;margin-right:4px">${escapeHtml(p.availability)}</span>` : ''}</span>
                <span class="farm-detail-produce-price">${Number.isFinite(price) ? `₪${price % 1 ? price.toFixed(1) : price.toFixed(0)} / ${escapeHtml(p.unit || 'יח׳')}` : ''}</span>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
      ${(waLink || phoneLink) ? `
        <div class="farm-detail-actions">
          ${waLink ? `<a class="farm-action-btn primary farm-detail-actions" href="${escapeHtml(waLink)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;background:var(--green-800);color:#fff">WhatsApp 💬</a>` : ''}
          ${phoneLink ? `<a class="farm-action-btn secondary" href="${escapeHtml(phoneLink)}" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;background:var(--green-100);color:var(--green-800)">${escapeHtml(contact.phone)} 📞</a>` : ''}
        </div>` : ''}
    </div>
  `;

  sheet.querySelector('#farm-detail-close-btn')?.addEventListener('click', closeFarmModal);
  overlay.classList.add('open');
  sheet.scrollTop = 0;
}

function closeFarmModal() {
  document.getElementById('farm-modal-overlay')?.classList.remove('open');
}
```

- [ ] **Step 5: Update `farm-modal-close` binding in `mountMarket` to use `closeFarmModal`**

In the `mountMarket` function, the close button `#farm-modal-close` binding (if it exists as a static element) is now inside the dynamic content. Make sure the overlay backdrop click still closes it. Find where `farm-modal-close` is bound (it may be in `bindToolbar` or inline). Add overlay-click close to the overlay element in the HTML — find the overlay HTML in `mountMarket`:

```js
    <!-- Farm Details Modal -->
    <div class="farm-modal-overlay" id="farm-modal-overlay">
```
Add a click handler after `loadFarms()`:
```js
  document.getElementById('farm-modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('farm-modal-overlay')) closeFarmModal();
  });
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/market.js src/styles/screens.css
git commit -m "feat: replace farm modal sheet with full-page overlay"
```

---

## Task 6: Per-product expandable edit panel + image upload

**Files:**
- Modify: `src/screens/dashboard.js` (`buildProductCard`, add `handleProductImageUpload`, `deleteProduct`, update `saveFarmToDb`, `loadFarmFromDb`)
- Modify: `src/styles/screens.css` (add product edit panel styles)

- [ ] **Step 1: Add product edit panel CSS in screens.css**

After the `.product-card` section, add:
```css
/* ══ PRODUCT EDIT PANEL ══ */
.product-edit-toggle{
  width:100%;margin-top:10px;padding:11px 16px;
  background:var(--green-50);border:1.5px solid var(--green-100);
  border-radius:var(--r-md);font-size:14px;font-weight:700;
  color:var(--green-800);cursor:pointer;text-align:center;
  transition:background 0.15s;
}
.product-edit-toggle:hover{background:var(--green-100)}
.product-edit-panel{
  display:flex;flex-direction:column;gap:10px;
  padding:14px;margin-top:6px;
  background:var(--green-50);border-radius:var(--r-md);
  border:1px solid var(--green-100);
}
.product-img-upload-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:14px 16px;background:#fff;
  border:2px dashed var(--green-400);border-radius:var(--r-md);
  font-size:15px;font-weight:700;color:var(--green-800);cursor:pointer;
  min-height:52px;transition:border-color 0.15s,background 0.15s;
}
.product-img-upload-btn:hover{background:var(--green-100);border-color:var(--green-800)}
.product-img-preview{
  width:100%;height:120px;object-fit:cover;
  border-radius:var(--r-md);display:block;
}
.product-delete-btn{
  padding:14px 16px;background:#fff5f5;
  border:1.5px solid #fecaca;border-radius:var(--r-md);
  font-size:15px;font-weight:700;color:var(--red);cursor:pointer;
  min-height:52px;transition:background 0.15s;
}
.product-delete-btn:hover{background:#fee2e2}
.product-delete-btn.confirming{background:#fee2e2;border-color:var(--red)}
```

- [ ] **Step 2: Add `handleProductImageUpload` and `deleteProduct` functions in dashboard.js**

Add after `updateStats()`:
```js
// ─── product images ───────────────────────────────────────────────────────────
function getProductImageUrl(product) {
  if (product.imageUrl) return product.imageUrl;
  try { return localStorage.getItem(PRODUCT_IMAGE_KEY_PREFIX + product.id) || null; } catch { return null; }
}

async function handleProductImageUpload(productId, file) {
  if (file.size > 5 * 1024 * 1024) { showToast('התמונה גדולה מ-5MB', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result;
    try { localStorage.setItem(PRODUCT_IMAGE_KEY_PREFIX + productId, base64); } catch {}
    renderProducts();
    showToast('תמונה נשמרה ✓', 'success');

    if (currentUser) {
      const db = getDb();
      if (!db) return;
      const product = dashProducts.find(p => p.id === productId);
      const ext = file.name.split('.').pop().toLowerCase().replace('jpg', 'jpeg') || 'jpeg';
      const mime = ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
      const path = `${currentUser.id}/${productId}.${ext}`;
      const { error } = await db.storage.from('produce-images').upload(path, file, { contentType: mime, upsert: true });
      if (!error) {
        const url = db.storage.from('produce-images').getPublicUrl(path).data?.publicUrl;
        if (url && product) {
          product.imageUrl = url;
          writeProducts(dashProducts);
          renderProducts();
          saveFarmToDb(farmDraft, dashProducts);
        }
      }
    }
  };
  reader.readAsDataURL(file);
}

function deleteProduct(productId, confirmBtn) {
  if (!confirmBtn.dataset.confirming) {
    confirmBtn.dataset.confirming = '1';
    confirmBtn.classList.add('confirming');
    confirmBtn.textContent = '⚠️ לחץ שוב לאישור מחיקה';
    setTimeout(() => {
      if (confirmBtn.dataset.confirming) {
        confirmBtn.dataset.confirming = '';
        confirmBtn.classList.remove('confirming');
        confirmBtn.textContent = '🗑️ מחק מוצר';
      }
    }, 3000);
    return;
  }
  dashProducts = dashProducts.filter(p => p.id !== productId);
  try { localStorage.removeItem(PRODUCT_IMAGE_KEY_PREFIX + productId); } catch {}
  writeProducts(dashProducts);
  renderProducts();
  if (currentUser) saveFarmToDb(farmDraft, dashProducts);
  showToast('המוצר נמחק', 'success');
}
```

- [ ] **Step 3: Update `buildProductCard` to show product image + add edit panel**

Find `buildProductCard(product)` in dashboard.js. 

Change the `image.src` line to prefer the product's own image:
```js
  // After: image.src = getProduceImageSrc(product);
  // Replace with:
  const productImgUrl = getProductImageUrl(product);
  image.src = productImgUrl || getProduceImageSrc(product);
```

At the end of `buildProductCard`, before `return card;`, add:
```js
  // Edit toggle button
  const editToggle = document.createElement('button');
  editToggle.className = 'product-edit-toggle';
  editToggle.type = 'button';
  editToggle.textContent = 'עריכה ▾';

  // Edit panel
  const editPanel = document.createElement('div');
  editPanel.className = 'product-edit-panel';
  editPanel.hidden = true;

  // Image upload
  const imgLabel = document.createElement('label');
  imgLabel.className = 'product-img-upload-btn';
  imgLabel.htmlFor = `prod-img-${product.id}`;

  const existingImg = getProductImageUrl(product);
  if (existingImg) {
    const preview = document.createElement('img');
    preview.className = 'product-img-preview';
    preview.src = existingImg;
    preview.alt = 'תמונת מוצר';
    editPanel.appendChild(preview);
  }

  imgLabel.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> ${existingImg ? 'החלף תמונה' : 'העלה תמונה למוצר'}`;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = `prod-img-${product.id}`;
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await handleProductImageUpload(product.id, file);
    e.target.value = '';
  });

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'product-delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.textContent = '🗑️ מחק מוצר';
  deleteBtn.addEventListener('click', () => deleteProduct(product.id, deleteBtn));

  editPanel.appendChild(imgLabel);
  editPanel.appendChild(fileInput);
  editPanel.appendChild(deleteBtn);

  editToggle.addEventListener('click', () => {
    editPanel.hidden = !editPanel.hidden;
    editToggle.textContent = editPanel.hidden ? 'עריכה ▾' : 'סגור ▲';
  });

  card.appendChild(editToggle);
  card.appendChild(editPanel);

  return card;
```

- [ ] **Step 4: Update `saveFarmToDb` to include `image_url`**

In `saveFarmToDb`, find:
```js
    availability: p.qty || 'זמין', icon: p.icon || '', deal_key: null,
```
Replace with:
```js
    availability: p.qty || 'זמין', icon: p.icon || '', deal_key: null,
    image_url: p.imageUrl || null,
```

- [ ] **Step 5: Update `loadFarmFromDb` to read `image_url`**

In `loadFarmFromDb`, find the produce mapping:
```js
        active: true, icon: p.icon || '',
```
Replace with:
```js
        active: true, icon: p.icon || '',
        imageUrl: p.image_url || '',
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/dashboard.js src/styles/screens.css
git commit -m "feat: per-product expandable edit panel with image upload (localStorage+Supabase)"
```

---

## Task 7: Market shows custom produce images

**Files:**
- Modify: `src/components/farm-card.js`

- [ ] **Step 1: Update `thumbImage.src` in `createFarmCard` to prefer `image_url`**

In `src/components/farm-card.js`, find:
```js
  thumbImage.src = getProduceImageSrc(leadProduce);
```
Replace with:
```js
  thumbImage.src = (leadProduce && leadProduce.image_url) ? leadProduce.image_url : getProduceImageSrc(leadProduce);
```

Add an error handler so a broken custom URL falls back to the catalog image:
```js
  thumbImage.onerror = () => { thumbImage.src = getProduceImageSrc(leadProduce); thumbImage.onerror = null; };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/farm-card.js
git commit -m "feat: market farm card shows custom produce image_url when available"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Task 2: Products page empty state + FAB fix
- ✅ Task 1: All carousels slowed
- ✅ Tasks 4: Farm hero upload → profile-hero bg + status-card bg
- ✅ Task 5: Farm detail full-page overlay with hours, produce, contact
- ✅ Task 6: Per-product edit panel with image upload, localStorage+Supabase hybrid
- ✅ Task 7: Market product-visual uses `image_url`
- ✅ Task 3: Supabase migration for `image_url` column + bucket

**Type consistency:**
- `getProductImageUrl(product)` defined in Task 6, used in Task 6 — ✅
- `PRODUCT_IMAGE_KEY_PREFIX` defined in Task 4, used in Task 6 — ✅
- `handleProductImageUpload(productId, file)` defined + called in Task 6 — ✅
- `applyHeroImage(url)` defined + called in Task 4 — ✅
- `closeFarmModal()` defined + called in Task 5 — ✅
- `deleteProduct(productId, confirmBtn)` defined + called in Task 6 — ✅

**No placeholders:** All steps have complete code. ✅
