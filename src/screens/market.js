import { fetchFarms, watchAuth, getUserProfile, getCurrentUser, addFavorite, removeFavorite } from '../lib/firebase.js?v=20260612-firebase';
import { escapeHtml } from '../lib/escape.js';
import { createFarmCard } from '../components/farm-card.js?v=20260614-mobile-mapfix5';
import { state as filterState, clearBoardFilters } from '../lib/board-filters.js';
import { initMapInstance, focusFarmOnMap, destroyMap, resizeMap, syncMapMarkers, closeMapInfoWindow } from '../lib/maps.js?v=20260614-mobile-mapfix5';
import { applyBlurFade } from '../lib/magic-fx.js?v=20260614-mobile-mapfix5';
import { showToast } from '../lib/toast.js';
import { STATIC_FARMS } from '../data/farms.js?v=20260614-mobile-mapfix5';
import {
  getProduceAlt,
  getProduceById,
  getProduceCategoryLabel,
  getProduceImageSrc,
} from '../data/produce-art.js?v=20260611-audit-fixes';
import { getFarmPhotoSrc } from '../data/farm-photos.js?v=20260614-mobile-mapfix5';

let allFarms = [];
let pendingRegionFilter = null;
let abortController = null;
let debounceTimer = null;
let currentCatalogTab = 'all';
let farmModalLastFocus = null;
let userFavorites = new Set();
let unwatchAuth = null;

export function mountMarket(root) {
  abortController = new AbortController();
  unwatchAuth = watchAuth(async user => {
    if (!user) { userFavorites = new Set(); syncFavoriteHearts(); return; }
    try {
      const profile = await getUserProfile(user.uid);
      userFavorites = new Set(profile?.favorites || []);
    } catch { userFavorites = new Set(); }
    syncFavoriteHearts();
  });

  root.innerHTML = `
    <div class="app-container">

      <!-- Market Header -->
      <header class="market-header">
        <a href="#home" class="header-brand">
          <div class="brand-icon">
            <span class="brand-logo-fallback" aria-hidden="true">ג</span>
          </div>
          <div>
            <div class="brand-name">גזרוני</div>
            <div class="brand-sub">השער לחקלאות ישראלית</div>
          </div>
        </a>
        <div class="header-actions">
          <button class="map-toggle-btn" id="map-toggle" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
            <span>הסתר מפה</span>
          </button>
        </div>
      </header>

      <!-- Hero block -->
      <section class="market-hero" id="market-hero-sec">
        <h1 class="hero-tagline">לוח המשקים</h1>
        <p class="hero-sub">מי מגדל מה, בכמה לקילו, ואיך פונים ישירות — בלי רכישה באתר.</p>
      </section>

      <section class="board-controls" aria-label="חיפוש וסינון לוח המשקים">
        <div class="board-controls-top">
          <label class="board-search-box" for="farm-search-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input id="farm-search-input" type="search" autocomplete="off" placeholder="חפשו משק, תוצרת או יישוב" />
          </label>
          <span class="board-result-count" id="board-result-count">0 משקים</span>
          <button class="advanced-filters-toggle" id="advanced-filters-toggle" type="button" aria-expanded="false" aria-controls="advanced-filters-panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6h16"></path>
              <path d="M7 12h10"></path>
              <path d="M10 18h4"></path>
            </svg>
            <span>סינון מתקדם</span>
          </button>
        </div>

        <div class="filter-group board-regions-group">
          <span class="filter-group-label">
            <span class="filter-group-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z"></path>
                <circle cx="12" cy="10" r="2.4"></circle>
              </svg>
            </span>
            <span>אזור</span>
          </span>
          <div class="regions-row" id="regions-sec"></div>
        </div>

        <div class="advanced-filters-panel" id="advanced-filters-panel" hidden>
          <div class="board-controls-top advanced-filters-row">
            <label class="user-location-field" for="user-location-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z"></path>
                <circle cx="12" cy="10" r="2.4"></circle>
              </svg>
              <input id="user-location-input" type="text" autocomplete="address-level2" placeholder="היישוב שלי" />
            </label>
            <label class="board-sort-select" for="farm-sort-select">
              <span>מיון</span>
              <select id="farm-sort-select">
                <option value="distance">קרובים אליי</option>
                <option value="name">שם א–ת</option>
              </select>
            </label>
            <button class="board-filter-chip clear reset-filter-btn" id="reset-filter-btn" type="button" aria-label="איפוס כל הסינונים">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                <path d="M3 4v6h6"></path>
              </svg>
              <span>איפוס סינונים</span>
            </button>
          </div>

          <div class="filter-group">
            <span class="filter-group-label">
              <span class="filter-group-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22V12"></path>
                  <path d="M12 12c2.5-3.5 5-3.5 7-1a5 5 0 0 1-1 7c-2 2-4.5 0-6-6z"></path>
                  <path d="M12 12c-2.5-3.5-5-3.5-7-1a5 5 0 0 0 1 7c2 2 4.5 0 6-6z"></path>
                </svg>
              </span>
              <span>תוצרת</span>
            </span>
            <div class="categories-row" id="categories-sec"></div>
          </div>

          <div class="produce-catalog-panel" aria-label="קטלוג תוצרת לסינון משקים">
            <div class="produce-catalog-head">
              <div>
                <span class="produce-catalog-kicker">קטלוג תוצרת</span>
                <strong>בחרו כמו בסופר</strong>
              </div>
              <div class="produce-catalog-tabs" id="produce-catalog-tabs" aria-label="קטגוריות תוצרת"></div>
            </div>
            <div class="produce-catalog-grid" id="produce-catalog-grid"></div>
          </div>
        </div>
      </section>

      <!-- Content -->
      <main class="market-content" id="market-main">

        <!-- Grid view -->
        <div class="products-grid" id="products-grid"></div>

        <section class="map-column" aria-label="מפת המשקים">
          <!-- Map view -->
          <div class="map-view-container" id="map-container">
            <div id="map"></div>
          </div>
        </section>

        <section class="nearby-deals" id="nearby-deals" aria-label="מבצעים באיזורך">
          <div class="deals-header">
            <div class="deals-title-wrap">
              <div class="deals-kicker">מבצעים באיזורך</div>
              <div class="deals-title">המחירים הכי טובים לידך</div>
              <div class="deals-sub">הכי זול לכל תוצרת מתוך המשקים שמוצגים עכשיו</div>
            </div>
            <div class="deals-badge" id="deals-count">0 מציאות</div>
          </div>
          <div class="deals-carousel">
            <div class="deals-track" id="deals-track"></div>
          </div>
        </section>

      </main>

    </div><!-- /app-container -->

    <!-- Farm Details Modal -->
    <div class="farm-modal-overlay" id="farm-modal-overlay">
      <div class="farm-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="farm-modal-heading" tabindex="-1">
        <div class="drawer-handle"></div>
        <div class="drawer-header">
          <div class="drawer-title" id="farm-modal-heading">פרטי המשק</div>
          <button class="drawer-close" id="farm-modal-close" type="button" aria-label="סגור">×</button>
        </div>
        <div class="farm-modal-body" id="farm-modal-body"></div>
      </div>
    </div>
  `;

  // Deep link from the home regions grid: #market?region=<name> applies that
  // region filter on arrival. Captured before the async render so pills, board
  // and map markers all open already filtered.
  const deepRegion = readRegionParam();
  if (deepRegion) {
    filterState.currentRegion = deepRegion;
    filterState.selectedFarmFilter = null;
    filterState.focusedFarmId = null;
    pendingRegionFilter = deepRegion;
    // Drop the query from the URL so the filter lives in state, not the hash.
    try { history.replaceState(null, '', `${location.pathname}${location.search}#market`); } catch {}
  }

  loadFarms();
  bindToolbar();
  bindMapToggle();
  window.addEventListener('gezroni:open-farm-details', handleMapDetailsRequest);
  document.getElementById('farm-modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('farm-modal-overlay')) closeFarmModal();
  });

  filterState.refresh = () => renderFarmList(applyFilters(allFarms));
  filterState.seedMarkers = () => syncMapMarkers(applyFilters(allFarms));

  return cleanup;
}

function readRegionParam() {
  const query = location.hash.split('?')[1] || '';
  const value = new URLSearchParams(query).get('region');
  return value ? value.trim() : '';
}

function cleanup() {
  pendingRegionFilter = null;
  closeFarmModal();
  if (unwatchAuth) { unwatchAuth(); unwatchAuth = null; }
  if (abortController) { abortController.abort(); abortController = null; }
  clearTimeout(debounceTimer);
  window.removeEventListener('gezroni:open-farm-details', handleMapDetailsRequest);
  destroyMap();
  filterState.refresh = null;
  filterState.seedMarkers = null;
  allFarms = [];
}

function handleMapDetailsRequest(event) {
  const farmId = String(event.detail?.farmId ?? '');
  const farm = allFarms.find(item => String(item.id) === farmId);
  if (farm) openFarmModal(farm);
}

function initMarketMap(farms) {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  initMapInstance(mapEl, farms)
    .then(() => {
      syncMapMarkers(applyFilters(allFarms));
      window.setTimeout(() => resizeMap(), 120);
    })
    .catch(() => {
      const cont = document.getElementById('map-container');
      if (cont) {
        cont.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;background:#f5f5f5;border-radius:var(--r-lg);"><p style="text-align:center;font-size:13px;color:var(--text-2)">מפה לא זמינה</p></div>`;
      }
    });
}

function cloneStaticFarms() {
  return STATIC_FARMS.map(farm => ({
    ...farm,
    contact: { ...(farm.contact || {}) },
    tags: [...(farm.tags || [])],
    produce: (farm.produce || []).map(item => ({ ...item })),
  }));
}

function renderStaticFallback(reason) {
  allFarms = cloneStaticFarms();
  buildRegionPills(allFarms);
  buildCategoryChips(allFarms);
  renderProduceCatalog();
  renderFarmList(applyFilters(allFarms));
  initMarketMap(allFarms);
  if (reason) console.info(`[Gezroni] ${reason}`);
}

async function loadFarms() {
  const list = document.getElementById('products-grid');
  if (!list) return;
  list.innerHTML = buildSkeletons(3);

  let data;
  try {
    data = await fetchFarms();
  } catch (e) {
    console.error('[gezroni] farms load failed', e);
    renderStaticFallback('חיבור השרת נכשל, מציגים את לוח הדמו המקומי');
    return;
  }

  if (abortController?.signal.aborted) return;

  if (!data || data.length === 0) {
    renderStaticFallback('מציגים נתוני דמו עד שחיבור השרת יחזור');
    return;
  }

  // Hero image: first image reference on the farm doc (still hosted on the old storage bucket)
  const LEGACY_STORAGE = 'https://owugjzjegchuldizgurj.supabase.co/storage/v1/object/public/farm-images/';
  data.forEach(farm => {
    const imgs = Array.isArray(farm.images) ? farm.images : [];
    const hero = imgs.find(i => i.is_primary) || imgs[0];
    if (hero?.storage_path) farm.hero_image_url = LEGACY_STORAGE + hero.storage_path;
  });

  allFarms = data;
  buildRegionPills(allFarms);
  buildCategoryChips(allFarms);
  renderProduceCatalog();
  renderFarmList(applyFilters(allFarms));

  initMarketMap(allFarms);
}

function buildSkeletons(n) {
  return Array.from({ length: n }, () => `
    <article class="product-card farm-card" style="animation:shimmerBg 1.5s infinite;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;min-height:180px;"></article>
  `).join('');
}

function emptyState(msg) {
  return `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--text-3);">
    <div style="font-size:2rem;margin-bottom:8px;">🌾</div>
    <div style="font-size:15px;font-weight:700;">${msg}</div>
  </div>`;
}

function buildRegionPills(farms) {
  const row = document.getElementById('regions-sec');
  if (!row) return;

  const regionNames = [...new Set(farms.map(f => f.region).filter(Boolean))];
  // Guard against a stale/unknown region (e.g. an old deep link) leaving the
  // board filtered to nothing.
  if (filterState.currentRegion !== 'all' && !regionNames.includes(filterState.currentRegion)) {
    filterState.currentRegion = 'all';
    pendingRegionFilter = null;
  }

  const regions = ['all', ...regionNames];
  row.innerHTML = regions.map(r => {
    const active = r === filterState.currentRegion;
    const label = r === 'all' ? 'כל האזורים' : r;
    return `<div class="region-pill${active ? ' active' : ''}" data-val="${escapeHtml(r)}" role="button" tabindex="0" aria-pressed="${active}" aria-label="סינון לפי אזור: ${escapeHtml(label)}">${escapeHtml(label)}</div>`;
  }).join('');

  const activate = pill => {
    const val = pill.dataset.val;
    row.querySelectorAll('.region-pill').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    pill.classList.add('active');
    pill.setAttribute('aria-pressed', 'true');
    filterState.currentRegion = val;
    filterState.selectedFarmFilter = null;
    renderProduceCatalog();
    renderFarmList(applyFilters(allFarms));
  };

  if (!row.dataset.bound) {
    row.dataset.bound = '1';
    row.addEventListener('click', e => {
      const pill = e.target.closest('.region-pill');
      if (pill) activate(pill);
    });
    row.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const pill = e.target.closest('.region-pill');
      if (!pill) return;
      e.preventDefault();
      activate(pill);
    });
  }

  // Arrived via a region deep link: reveal the filtered map and announce it.
  if (pendingRegionFilter) {
    const region = pendingRegionFilter;
    const count = farms.filter(f => f.region === region).length;
    pendingRegionFilter = null;
    requestAnimationFrame(() => {
      const mapEl = document.getElementById('map-container');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`מציג ${count} ${count === 1 ? 'משק' : 'משקים'} באזור ${region}`, 'success');
    });
  }
}

const CAT_ICONS = {
  all: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  vegetables: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 5c0-1.5 1-2 1-2s-1.5.5-2 1.5"/></svg>`,
  greens: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V12"/><path d="M12 12c2.5-3.5 5-3.5 7-1a5 5 0 0 1-1 7c-2 2-4.5 0-6-6z"/><path d="M12 12c-2.5-3.5-5-3.5-7-1a5 5 0 0 0 1 7c2 2 4.5 0 6-6z"/></svg>`,
  roots: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18.8 5.2c-1.8-1.8-4.5-1.8-6.3 0L3.8 13.9c-.8.8-.8 2 0 2.8l3.5 3.5c.8.8 2 .8 2.8 0l8.7-8.7c1.7-1.8 1.7-4.5 0-6.3z"/><path d="M10 9l5 5"/></svg>`,
  fruit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c0-2 1.2-3 3-3"/><circle cx="11" cy="14" r="7"/><path d="M8 7c2 0 4 0 6-2"/></svg>`,
};
const CAT_LABELS = { all: 'הכל', vegetables: 'ירקות', greens: 'עלים', roots: 'שורשים', fruit: 'פירות' };

function buildCategoryChips(farms) {
  const row = document.getElementById('categories-sec');
  if (!row) return;
  const cats = ['all', ...new Set(farms.flatMap(f => (f.produce || []).map(p => p.category)).filter(Boolean))];
  row.innerHTML = cats.map(c => `
    <div class="category-card${c === filterState.currentCategory ? ' active' : ''}" data-val="${c}" role="button" tabindex="0">
      <div class="category-icon-wrap">${CAT_ICONS[c] || CAT_ICONS.all}</div>
      <span class="category-label">${CAT_LABELS[c] || c}</span>
    </div>
  `).join('');
  row.addEventListener('click', e => {
    const card = e.target.closest('.category-card');
    if (!card) return;
    row.querySelectorAll('.category-card').forEach(b => b.classList.remove('active'));
    card.classList.add('active');
    filterState.currentCategory = card.dataset.val;
    filterState.currentProduce = 'all';
    filterState.selectedFarmFilter = null;
    renderProduceCatalog();
    renderFarmList(applyFilters(allFarms));
  });
}

function applyFilters(farms) {
  let result = [...farms];
  const { currentRegion, currentCategory, currentProduce, currentSearchTerm, currentSort, selectedFarmFilter } = filterState;

  if (selectedFarmFilter) return result.filter(f => f.id === selectedFarmFilter);
  if (currentRegion !== 'all') result = result.filter(f => f.region === currentRegion);
  if (currentCategory !== 'all') result = result.filter(f => (f.produce || []).some(p => getProduceCategory(p) === currentCategory));
  if (currentProduce !== 'all') result = result.filter(f => (f.produce || []).some(p => getProduceCatalogId(p) === currentProduce));
  const trimmedSearch = (currentSearchTerm || '').trim();
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    result = result.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.region || '').toLowerCase().includes(q) ||
      (f.city || '').toLowerCase().includes(q) ||
      (f.produce || []).some(p => {
        const catalogItem = getProduceById(p);
        return (p.name || '').toLowerCase().includes(q) ||
          (catalogItem?.name || '').toLowerCase().includes(q) ||
          (catalogItem?.id || '').toLowerCase().includes(q);
      })
    );
  }
  if (currentSort === 'distance') result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
  if (currentSort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  return result;
}

const PRODUCE_CATEGORY_ORDER = ['vegetables', 'fruit', 'greens', 'roots', 'herbs'];

function getProduceCatalogId(item) {
  return getProduceById(item)?.id || item?.id || item?.catalogId || '';
}

function getProduceCategory(item) {
  return getProduceById(item)?.category || item?.category || 'vegetables';
}

function getCatalogBaseFarms() {
  let result = [...allFarms];
  const { currentRegion, currentCategory, currentSearchTerm } = filterState;

  if (currentRegion !== 'all') result = result.filter(f => f.region === currentRegion);
  if (currentCategory !== 'all') result = result.filter(f => (f.produce || []).some(p => getProduceCategory(p) === currentCategory));
  const trimmedSearch = (currentSearchTerm || '').trim();
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    result = result.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.region || '').toLowerCase().includes(q) ||
      (f.city || '').toLowerCase().includes(q) ||
      (f.produce || []).some(p => {
        const catalogItem = getProduceById(p);
        return (p.name || '').toLowerCase().includes(q) ||
          (catalogItem?.name || '').toLowerCase().includes(q) ||
          (catalogItem?.id || '').toLowerCase().includes(q);
      })
    );
  }

  return result;
}

function collectAvailableProduce(farms) {
  const byId = new Map();
  farms.forEach(farm => {
    (farm.produce || []).forEach(item => {
      const catalogItem = getProduceById(item);
      if (!catalogItem?.id) return;
      const existing = byId.get(catalogItem.id) || {
        item: catalogItem,
        count: 0,
        minPrice: null,
      };
      const price = Number(item.price);
      existing.count += 1;
      if (Number.isFinite(price)) {
        existing.minPrice = existing.minPrice == null ? price : Math.min(existing.minPrice, price);
      }
      byId.set(catalogItem.id, existing);
    });
  });

  return Array.from(byId.values()).sort((a, b) => {
    const categoryDelta = PRODUCE_CATEGORY_ORDER.indexOf(a.item.category) - PRODUCE_CATEGORY_ORDER.indexOf(b.item.category);
    if (categoryDelta !== 0) return categoryDelta;
    return a.item.name.localeCompare(b.item.name, 'he');
  });
}

function renderProduceCatalog() {
  const tabs = document.getElementById('produce-catalog-tabs');
  const grid = document.getElementById('produce-catalog-grid');
  if (!tabs || !grid) return;

  const baseFarms = getCatalogBaseFarms();
  const available = collectAvailableProduce(baseFarms);
  const availableCategories = new Set(available.map(entry => entry.item.category));
  const tabOptions = ['all', ...PRODUCE_CATEGORY_ORDER.filter(category => availableCategories.has(category))];
  if (!tabOptions.includes(currentCatalogTab)) currentCatalogTab = 'all';

  tabs.innerHTML = tabOptions.map(category => `
    <button class="catalog-tab${category === currentCatalogTab ? ' active' : ''}" type="button" data-category="${category}">
      ${category === 'all' ? 'כל התוצרת' : getProduceCategoryLabel(category)}
    </button>
  `).join('');

  tabs.querySelectorAll('.catalog-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentCatalogTab = tab.dataset.category || 'all';
      renderProduceCatalog();
    });
  });

  const visibleItems = currentCatalogTab === 'all'
    ? available
    : available.filter(entry => entry.item.category === currentCatalogTab);

  const allActive = filterState.currentProduce === 'all';
  const cards = [
    `<button class="produce-catalog-card produce-catalog-all${allActive ? ' active' : ''}" type="button" data-produce-id="all" aria-pressed="${allActive ? 'true' : 'false'}">
      <span class="produce-catalog-icon-stack" aria-hidden="true">${renderCatalogStackImages(visibleItems.slice(0, 3))}</span>
      <span class="produce-catalog-name">כל התוצרת</span>
      <span class="produce-catalog-meta">${baseFarms.length} משקים</span>
    </button>`,
    ...visibleItems.map(({ item, count, minPrice }) => {
      const active = filterState.currentProduce === item.id;
      const priceText = minPrice == null ? `${count} משקים` : `מ־₪${formatPrice(minPrice)} / ${item.unit || 'יח׳'}`;
      return `
        <button class="produce-catalog-card${active ? ' active' : ''}" type="button" data-produce-id="${item.id}" aria-pressed="${active ? 'true' : 'false'}">
          <img src="${getProduceImageSrc(item)}" alt="${item.name}" loading="lazy">
          <span class="produce-catalog-name">${item.name}</span>
          <span class="produce-catalog-meta">${priceText}</span>
        </button>`;
    })
  ];

  grid.innerHTML = cards.join('');
  grid.querySelectorAll('.produce-catalog-card').forEach(card => {
    card.addEventListener('click', () => {
      filterState.currentProduce = card.dataset.produceId || 'all';
      filterState.selectedFarmFilter = null;
      grid.querySelectorAll('.produce-catalog-card').forEach(item => {
        const isActive = item === card;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      renderFarmList(applyFilters(allFarms));
    });
  });

  if (!visibleItems.length) {
    grid.innerHTML = `
      <div class="produce-catalog-empty">
        אין תוצרת מתאימה לסינון הנוכחי
      </div>`;
  }
}

function renderCatalogStackImages(entries) {
  if (!entries.length) return '<span class="catalog-stack-fallback">🌾</span>';
  return entries.map(entry => `<img src="${getProduceImageSrc(entry.item)}" alt="" aria-hidden="true" loading="lazy">`).join('');
}

function renderFarmList(farms) {
  const list = document.getElementById('products-grid');
  const count = document.getElementById('board-result-count');
  if (!list) return;
  if (count) count.textContent = farms.length + ' משקים';
  syncMapMarkers(farms);
  renderDeals(farms);
  if (farms.length === 0) { list.innerHTML = emptyState('אין תוצאות לסינון הנוכחי'); return; }

  list.innerHTML = '';
  farms.forEach(farm => {
    const card = createFarmCard(farm, {});
    attachFavoriteHeart(card, farm);
    const detailBtn = card.querySelector('.farm-action-btn.primary');
    if (detailBtn) detailBtn.addEventListener('click', e => { e.stopPropagation(); openFarmModal(farm); });
    card.addEventListener('click', () => {
      revealMapForFocus();
      window.setTimeout(() => focusFarmOnMap(farm.id), 120);
    });
    list.appendChild(card);
  });
  applyBlurFade(list.children, { step: 50 });
}

function renderDeals(farms) {
  const track = document.getElementById('deals-track');
  const count = document.getElementById('deals-count');
  if (!track) return;

  const bestByProduce = new Map();
  farms.forEach(farm => {
    (farm.produce || []).forEach(item => {
      const price = Number(item.price);
      if (!Number.isFinite(price)) return;
      const key = (item.name || '').trim();
      if (!key) return;
      const current = bestByProduce.get(key);
      if (!current || price < current.price) {
        bestByProduce.set(key, { farm, item, price });
      }
    });
  });

  const deals = Array.from(bestByProduce.values()).sort((a, b) => a.price - b.price);
  if (count) count.textContent = deals.length + ' מציאות';
  track.innerHTML = '';

  if (!deals.length) {
    const empty = document.createElement('div');
    empty.className = 'deal-empty';
    empty.textContent = 'אין מבצעים להצגה בסינון הנוכחי';
    track.appendChild(empty);
    return;
  }

  const createGroup = () => {
    const group = document.createElement('div');
    group.className = 'deals-group';

    deals.forEach(({ farm, item, price }) => {
      const card = document.createElement('button');
      card.className = 'deal-card';
      card.type = 'button';
      card.addEventListener('click', () => {
        revealMapForFocus();
        window.setTimeout(() => focusFarmOnMap(farm.id), 120);
      });

      const icon = document.createElement('div');
      icon.className = 'deal-icon';
      const image = document.createElement('img');
      image.src = getProduceImageSrc(item);
      image.alt = getProduceAlt(item);
      image.loading = 'lazy';
      image.onerror = () => {
        image.remove();
        icon.textContent = item.icon || '🌿';
      };
      icon.appendChild(image);

      const body = document.createElement('div');
      body.className = 'deal-body';
      body.appendChild(createTextNode('div', 'deal-label', item.name || 'תוצרת'));
      body.appendChild(createTextNode('div', 'deal-price', `₪${price % 1 ? price.toFixed(1) : price.toFixed(0)} / ${item.unit || 'יח׳'}`));
      body.appendChild(createTextNode('div', 'deal-farm', farm.name || 'משק'));

      card.appendChild(icon);
      card.appendChild(body);
      group.appendChild(card);
    });

    return group;
  };

  track.appendChild(createGroup());
  if (deals.length > 1) track.appendChild(createGroup());
}

function createTextNode(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function formatPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value || '');
  return numeric % 1 ? numeric.toFixed(1) : numeric.toFixed(0);
}

function bindToolbar() {
  const search = document.getElementById('farm-search-input');
  const sort = document.getElementById('farm-sort-select');
  if (search) {
    search.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterState.currentSearchTerm = search.value;
        renderProduceCatalog();
        renderFarmList(applyFilters(allFarms));
      }, 220);
    });
  }
  if (sort) sort.addEventListener('change', () => {
    filterState.currentSort = sort.value;
    renderFarmList(applyFilters(allFarms));
  });
  const advToggle = document.getElementById('advanced-filters-toggle');
  const advPanel = document.getElementById('advanced-filters-panel');
  if (advToggle && advPanel) {
    advToggle.addEventListener('click', () => {
      const open = advPanel.hidden;
      advPanel.hidden = !open;
      advToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      advToggle.classList.toggle('open', open);
    });
  }
  document.getElementById('reset-filter-btn')?.addEventListener('click', () => {
    clearBoardFilters();
    const searchEl = document.getElementById('farm-search-input');
    const sortEl = document.getElementById('farm-sort-select');
    if (searchEl) searchEl.value = '';
    if (sortEl) sortEl.value = 'distance';
    // Reset active state on region/category pills
    document.getElementById('regions-sec')?.querySelectorAll('.region-pill').forEach((p, i) => p.classList.toggle('active', i === 0));
    document.getElementById('categories-sec')?.querySelectorAll('.category-card').forEach((p, i) => p.classList.toggle('active', i === 0));
    currentCatalogTab = 'all';
    renderProduceCatalog();
    renderFarmList(applyFilters(allFarms));
  });
}

function isMapVisible(container) {
  return container && getComputedStyle(container).display !== 'none';
}

function setMapVisibility(visible) {
  const btn = document.getElementById('map-toggle');
  const container = document.getElementById('map-container');
  if (!container) return;

  container.style.display = visible ? 'block' : 'none';
  const span = btn?.querySelector('span');
  if (span) span.textContent = visible ? 'הסתר מפה' : 'הצג מפה';

  if (visible) {
    window.setTimeout(() => resizeMap(), 80);
    window.setTimeout(() => resizeMap(), 260);
  }
}

function revealMapForFocus() {
  const container = document.getElementById('map-container');
  if (!container) return;
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

  if (!isMapVisible(container)) {
    setMapVisibility(true);
  } else if (!isDesktop) {
    window.setTimeout(() => resizeMap(), 40);
  }

  if (!isDesktop) {
    window.setTimeout(() => {
      container.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, 90);
  }
}

function bindMapToggle() {
  const btn = document.getElementById('map-toggle');
  const container = document.getElementById('map-container');
  if (!btn || !container) return;
  btn.addEventListener('click', () => {
    setMapVisibility(!isMapVisible(container));
  });
}

// Task 7: Farm detail modal

function openFarmModal(farm) {
  const overlay = document.getElementById('farm-modal-overlay');
  const sheet = overlay?.querySelector('.farm-modal-sheet');
  if (!overlay || !sheet) return;
  farmModalLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  closeMapInfoWindow();

  const produce = farm.produce || [];
  const contact = farm.contact || {};
  const rawDigits = (contact.whatsapp || contact.phone || '').replace(/\D/g, '');
  // Israeli numbers stored as 0XXXXXXXXX need country code 972 for wa.me to work
  const waNum = rawDigits.startsWith('0') ? '972' + rawDigits.slice(1) : rawDigits;
  const waLink = waNum ? `https://wa.me/${waNum}` : null;
  const phoneDigits = (contact.phone || '').replace(/\D/g, '');
  const phoneLink = phoneDigits ? `tel:${phoneDigits}` : null;
  const phoneDisplay = phoneDigits.length === 10
    ? `${phoneDigits.slice(0,3)}-${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`
    : (contact.phone || '');

  const heroUrl = getFarmPhotoSrc(farm);

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
                <img class="farm-detail-produce-img${p.image_url ? ' is-photo' : ''}" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.style.display='none'">
                <span class="farm-detail-produce-name">${escapeHtml(p.name)}${p.availability ? ` <span style="font-size:11px;background:var(--green-100);color:var(--green-800);padding:2px 7px;border-radius:20px;font-weight:800;margin-right:4px">${escapeHtml(p.availability)}</span>` : ''}</span>
                <span class="farm-detail-produce-price">${Number.isFinite(price) ? `₪${price % 1 ? price.toFixed(1) : price.toFixed(0)} / ${escapeHtml(p.unit || 'יח׳')}` : ''}</span>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
      ${(waLink || phoneLink) ? `
        <div class="farm-detail-actions">
          ${waLink ? `<a class="farm-action-btn primary" href="${escapeHtml(waLink)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;background:var(--green-800);color:#fff">WhatsApp 💬</a>` : ''}
          ${phoneLink ? `<a class="farm-action-btn secondary" href="${escapeHtml(phoneLink)}" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;background:var(--green-100);color:var(--green-800)">${escapeHtml(phoneDisplay)} 📞</a>` : ''}
        </div>` : ''}
    </div>
  `;

  sheet.querySelector('#farm-detail-close-btn')?.addEventListener('click', closeFarmModal);
  document.body.classList.add('farm-detail-open');
  document.documentElement.classList.add('farm-detail-open');
  overlay.classList.add('open');
  sheet.scrollTop = 0;
  sheet.focus({ preventScroll: true });
}

function closeFarmModal() {
  const overlay = document.getElementById('farm-modal-overlay');
  overlay?.classList.remove('open');
  document.body.classList.remove('farm-detail-open');
  document.documentElement.classList.remove('farm-detail-open');
  if (farmModalLastFocus?.isConnected) {
    farmModalLastFocus.focus({ preventScroll: true });
  }
  farmModalLastFocus = null;
}


function attachFavoriteHeart(card, farm) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'farm-fav-btn';
  btn.dataset.farmId = farm.id;
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7z"/></svg>';
  setHeartState(btn, userFavorites.has(farm.id));
  btn.addEventListener('click', async e => {
    e.stopPropagation();
    if (!getCurrentUser()) { location.hash = '#account'; return; }
    const isFav = userFavorites.has(farm.id);
    try {
      if (isFav) { await removeFavorite(farm.id); userFavorites.delete(farm.id); }
      else { await addFavorite(farm.id); userFavorites.add(farm.id); }
      setHeartState(btn, !isFav);
    } catch (err) {
      console.error('[gezroni] favorite toggle failed', err);
    }
  });
  card.querySelector('.product-visual')?.appendChild(btn);
}

function setHeartState(btn, isFav) {
  btn.classList.toggle('is-fav', isFav);
  btn.setAttribute('aria-label', isFav ? 'הסרת המשק מהשמורים' : 'שמירת המשק');
  btn.setAttribute('aria-pressed', String(isFav));
}

function syncFavoriteHearts() {
  document.querySelectorAll('.farm-fav-btn').forEach(btn => {
    setHeartState(btn, userFavorites.has(btn.dataset.farmId));
  });
}
