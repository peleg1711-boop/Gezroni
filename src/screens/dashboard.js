import { getDb } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';
import { geocodeFarmCity } from '../lib/maps.js?v=20260611-audit-fixes';
import {
  getProduceAlt,
  getProduceById,
  getProduceCatalog,
  getProduceCategoryLabel,
  getProduceImageSrc,
} from '../data/produce-art.js?v=20260611-audit-fixes';

// ─── module-level state (survives screen mounts) ────────────────────────────
const FARM_DRAFT_KEY = 'gezroni:farm-listing-draft:v2';
const PRODUCTS_KEY   = 'gezroni:farm-products-draft:v2';
const FARM_HERO_KEY = 'gezroni:farm-hero-image';
const PRODUCT_IMAGE_KEY_PREFIX = 'gezroni:product-image:';

const DEFAULT_FARM_DRAFT = {
  farmName: '', farmerName: '',
  region: '', city: '', phone: '',
  availability: '', pickup: '', note: '',
  hours: '', directions: '',
  lat: null, lng: null,
};

const DEFAULT_PRODUCTS = [];

function readDraft()    { try { const r = localStorage.getItem(FARM_DRAFT_KEY); return r ? { ...DEFAULT_FARM_DRAFT, ...JSON.parse(r) } : { ...DEFAULT_FARM_DRAFT }; } catch { return { ...DEFAULT_FARM_DRAFT }; } }
function readProducts() {
  try {
    const r = localStorage.getItem(PRODUCTS_KEY);
    const products = r ? JSON.parse(r) : [...DEFAULT_PRODUCTS];
    return products.map(normalizeProduct);
  } catch {
    return DEFAULT_PRODUCTS.map(normalizeProduct);
  }
}
function writeDraft(d)    { try { localStorage.setItem(FARM_DRAFT_KEY, JSON.stringify(d)); } catch {} }
function writeProducts(p) { try { localStorage.setItem(PRODUCTS_KEY,   JSON.stringify(p)); } catch {} }

function catalogUnitToDisplayUnit(unit) {
  if (!unit) return 'לק״ג';
  return unit.startsWith('ל') ? unit : `ל${unit}`;
}

function normalizeProduct(product) {
  const catalogItem = getProduceById(product?.catalogId || product);
  return {
    ...product,
    catalogId: product?.catalogId || catalogItem?.id || '',
    category: product?.category || catalogItem?.category || 'vegetables',
    unit: product?.unit || catalogUnitToDisplayUnit(catalogItem?.unit),
  };
}

let farmDraft        = readDraft();
let dashProducts     = readProducts();
let currentUser      = null;
let abortController  = null;
let currentTab       = 'home';
let tickerTimer      = null;
let farmerPickerCategory = 'all';

// ─── mount / cleanup ────────────────────────────────────────────────────────
export function mountDashboard(root) {
  abortController = new AbortController();
  farmDraft    = readDraft();
  dashProducts = readProducts();
  currentTab   = 'home';

  root.innerHTML = buildShell();

  bindNavTabs();
  bindListingTabs();
  // initChart();
  // initMarquee();
  // initTicker();
  bindAddProductModal();
  renderProducts();
  applyFarmDraft();
  setTimeout(() => updateStats(true), 300);

  setTimeout(() => initAuth(), 400);
  initPhotoUpload();
  initHeroUpload();
  return cleanup;
}

function cleanup() {
  if (abortController) { abortController.abort(); abortController = null; }
  clearInterval(tickerTimer);
  tickerTimer = null;
  currentUser = null;
}

function applyAdminBadge(user) {
  const wrap = document.getElementById('si-admin-wrap');
  if (wrap) wrap.hidden = user?.app_metadata?.role !== 'admin';
}

// ─── HTML shell ─────────────────────────────────────────────────────────────
function buildShell() {
  return `
<div class="app">

  <!-- TOP HEADER -->
  <header class="top-header">
    <a class="header-logo" href="#home">
      <div class="header-logo-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A5D96A" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2C6.5 2 2 6.5 2 12"/><path d="M12 8v8M8 12h8"/>
        </svg>
      </div>
      <div>
        <div class="header-logo-text">מהשדה לשולחן</div>
        <div class="header-logo-sub">פאנל חקלאי</div>
      </div>
    </a>
    <div style="display:flex;gap:4px">
      <button class="icon-btn" type="button" id="dash-notif-btn" aria-label="התראות">
        <div class="notif-dot"></div>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- PAGE NAV -->
  <nav class="global-page-nav" aria-label="ניווט ראשי">
    <a href="#market">לוח משקים</a>
    <a href="#dashboard" class="active" aria-current="page">ניהול משק</a>
  </nav>

  <!-- SCREENS -->
  <div class="screen-wrap">

    <!-- HOME SCREEN -->
    <div class="screen active" id="screen-home">
    <div class="pad-lg">

      <div class="status-card">
        <div class="hero-bg-img" id="status-card-bg" aria-hidden="true"></div>
        <div class="status-greeting">ניהול מודעת המשק</div>
        <div class="status-name" id="status-name">${farmDraft.farmName || 'שם המשק טרם הוגדר'}</div>
        <div class="status-meta">${farmDraft.region ? farmDraft.region + ' · ' : ''}מודעת פיילוט פעילה בלוח גזרוני</div>
        <div class="status-row">
          <div class="status-live"><span class="live-dot"></span><span class="live-text">מודעה פעילה</span></div>
          <span class="status-region">${farmDraft.region}</span>
        </div>
      </div>

      <div class="sec-header">
        <div class="sec-title">סיכום המודעה</div>
        <div class="sec-link" id="go-listing">עריכה ←</div>
      </div>
      <div class="stats-row">
        <div class="stat-card" id="stat-card-products">
          <div class="stat-val green" id="stat-orders">0</div>
          <div class="stat-label">פריטים בלוח</div>
          <div class="stat-delta up">פעילים</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-revenue">₪0</div>
          <div class="stat-label">המחיר הזול ביותר</div>
          <div class="stat-delta same">שקוף</div>
        </div>
      </div>

      <div class="sec-header"><div class="sec-title">פעולות מהירות</div></div>
      <div class="quick-actions">
        <button class="qa-pill primary" id="qa-add-produce" type="button">
          <div class="qa-icon-pill light">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div><div class="qa-title">הוסף תוצרת</div><div class="qa-sub">מחיר וזמינות</div></div>
        </button>
        <button class="qa-pill" id="qa-edit-listing" type="button">
          <div class="qa-icon-pill green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-800)" stroke-width="2" stroke-linecap="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <div><div class="qa-title">מודעת משק</div><div class="qa-sub">פרטים ויצירת קשר</div></div>
        </button>
      </div>

      <div style="height:20px"></div>
    </div>
    </div>

    <!-- PRODUCTS SCREEN -->
    <div class="screen" id="screen-products">
    <div class="pad-lg">
      <div class="sec-header" style="margin-top:4px">
        <div class="sec-title">תוצרת ומחירים</div>
        <div id="products-count" style="font-size:12px;color:var(--text-3);font-weight:600"></div>
      </div>
      <div id="products-list"></div>
      <div style="height:90px"></div>
    </div>
    </div>

    <!-- LISTING SCREEN -->
    <div class="screen" id="screen-orders">
    <div class="pad-lg">
      <div style="margin-top:4px;margin-bottom:16px">
        <div class="order-tabs">
          <div class="otab active" data-otab="pending">פרטי משק</div>
          <div class="otab" data-otab="processing">זמינות</div>
          <div class="otab" data-otab="done">תצוגה</div>
        </div>
      </div>

      <div class="order-section active" id="otab-pending">
        <div class="card" style="padding:16px 18px">
          <div class="field"><label for="listing-farm-name">שם המשק</label><input type="text" id="listing-farm-name" placeholder="משק הירקות של לוי"></div>
          <div class="field"><label for="listing-farmer-name">שם החקלאי/ת</label><input type="text" id="listing-farmer-name" placeholder="ישראל לוי"></div>
          <div class="field-row">
            <div class="field"><label for="listing-region">אזור</label>
              <select id="listing-region">
                <option>עמק חפר</option><option>דרום השרון</option><option>צפון השרון</option><option>אחר</option>
              </select>
            </div>
            <div class="field"><label for="listing-city">יישוב</label><input type="text" id="listing-city" placeholder="כפר ויתקין"></div>
          </div>
          <div class="field"><label for="listing-phone">טלפון</label><input type="tel" id="listing-phone" placeholder="050-0000000"></div>
          <button class="btn-shine" id="save-draft-btn" type="button">שמור טיוטת מודעה ←</button>
        </div>

        <div class="card" style="padding:16px 18px;margin-top:12px">
          <div class="field-label-row">
            <label>תמונות המשק</label>
            <span style="font-size:11px;color:var(--text-3)">עד 5MB לתמונה · JPG / PNG / WebP</span>
          </div>
          <div class="photos-grid" id="farm-photos-grid"></div>
          <label class="photos-upload-btn" for="farm-photo-input" id="farm-photo-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            העלה תמונה
          </label>
          <input type="file" id="farm-photo-input" accept="image/jpeg,image/png,image/webp" multiple style="display:none">
        </div>
      </div>

      <div class="order-section" id="otab-processing">
        <div class="card" style="padding:16px 18px">
          <div class="field"><label for="listing-availability">זמינות כללית</label><input type="text" id="listing-availability" placeholder="זמין השבוע לאיסוף בתיאום"></div>
          <div class="field"><label for="listing-pickup">הוראות איסוף</label><textarea id="listing-pickup" rows="3" placeholder="איסוף מהמשק בבוקר או נקודת חלוקה בערב"></textarea></div>
          <div class="field"><label for="listing-hours">שעות פעילות</label><textarea id="listing-hours" rows="3" placeholder="ראשון–חמישי 8:00–14:00&#10;שישי 7:00–12:00&#10;שבת — סגור"></textarea></div>
          <div class="field"><label for="listing-directions">איך מגיעים?</label><textarea id="listing-directions" rows="3" placeholder="מגיעים מכביש 4, ניתן להיכנס דרך שער הצפון. חנייה ליד האסם."></textarea></div>
          <div class="field"><label for="listing-note">הערה לתושבים</label><textarea id="listing-note" rows="3" placeholder="אין רכישה באתר. פונים אליי ישירות לתיאום."></textarea></div>
          <button class="btn-shine" id="save-availability-btn" type="button">שמור ←</button>
        </div>
      </div>

      <div class="order-section" id="otab-done">
        <div class="order-card">
          <div class="order-top">
            <div><div class="order-buyer" id="listing-preview-name"></div><div class="order-time" id="listing-preview-region"></div></div>
            <span class="badge active">תצוגה בלוח</span>
          </div>
          <div class="order-items" id="listing-preview-note"></div>
          <div style="height:1px;background:rgba(0,0,0,0.05);margin:12px 0"></div>
          <div class="order-bottom">
            <div class="order-total" id="listing-preview-phone"></div>
            <button class="btn-sm btn-view" id="go-products-2" type="button">ערוך תוצרת</button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- PROFILE SCREEN -->
    <div class="screen" id="screen-profile">
      <div class="profile-hero" id="profile-hero">
        <div class="hero-bg-img" id="profile-hero-bg" aria-hidden="true"></div>
        <label class="hero-upload-zone" for="hero-photo-input" aria-label="שנה תמונת משק">
          <div class="hero-upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span class="hero-upload-label">שנה תמונה</span>
          <input type="file" id="hero-photo-input" accept="image/jpeg,image/png,image/webp" style="display:none">
        </label>
        <div class="avatar">🌾</div>
        <div class="profile-name" id="profile-name">${farmDraft.farmName || 'שם המשק טרם הוגדר'}</div>
        <div class="profile-sub" id="profile-sub">${[farmDraft.farmerName, farmDraft.region].filter(Boolean).join(' · ') || 'מלא את פרטי המשק'}</div>
        <div class="profile-chips" id="profile-chips"></div>
      </div>
      <div class="pad-lg">
        <div class="stats-row" style="margin-bottom:22px">
          <div class="stat-card" id="pc-rating" style="cursor:pointer"><div class="stat-val green">4.9</div><div class="stat-label">דירוג ⭐</div></div>
          <div class="stat-card" id="pc-inquiries" style="cursor:pointer"><div class="stat-val">23</div><div class="stat-label">פניות החודש</div></div>
          <div class="stat-card" id="pc-satisfaction" style="cursor:pointer"><div class="stat-val">94%</div><div class="stat-label">שביעות רצון</div></div>
        </div>
        <div style="margin-top:16px;margin-bottom:24px">
          <button class="btn-shine" id="btn-share-farm" type="button" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:700;padding:12px;background:var(--green-900);color:#fff;border-radius:12px;border:none;cursor:pointer;min-height:48px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
            <span>שתף את מודעת המשק שלי בוואטסאפ</span>
          </button>
        </div>
        <div style="font-size:11px;font-weight:800;color:var(--text-3);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px">הגדרות המשק</div>
        <div class="settings-list">
          <div class="settings-item" id="si-edit">
            <div class="si-icon green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-800)" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></div>
            <div style="flex:1"><div class="si-label">עריכת פרטי המשק</div><div class="si-sub">שם, כתובת, תיאור</div></div>
            <svg class="si-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div class="settings-item" id="si-notif">
            <div class="si-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
            <div style="flex:1"><div class="si-label">התראות</div><div class="si-sub">פניות חדשות, תזכורות עדכון</div></div>
            <svg class="si-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
        </div>
        <div style="margin-top:12px" class="settings-list" id="si-admin-wrap" hidden>
          <a class="settings-item" href="#admin" style="text-decoration:none">
            <div class="si-icon" style="background:#f0f4ff"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
            <div style="flex:1"><div class="si-label">פאנל ניהול בקשות</div><div class="si-sub">אישור חקלאים חדשים</div></div>
            <svg class="si-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </a>
        </div>
        <div style="margin-top:12px" class="settings-list">
          <div class="settings-item" id="si-signout">
            <div class="si-icon red"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
            <div class="si-label" style="color:var(--red)">יציאה מהחשבון</div>
            <svg class="si-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
        </div>
        <div style="text-align:center;margin-top:22px;font-size:11px;color:var(--text-3);font-weight:500">מהשדה לשולחן · גרסת פיילוט · v0.1</div>
        <div style="height:12px"></div>
      </div>
    </div>

  </div><!-- /screen-wrap -->

  <!-- BOTTOM NAV -->
  <nav class="bottom-nav">
    <div class="nav-item active" id="nav-home" data-tab="home">
      <div class="nav-indicator"></div>
      <div style="position:relative;width:24px;height:24px">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <span class="nav-label">בית</span>
    </div>
    <div class="nav-item" id="nav-products" data-tab="products">
      <div class="nav-indicator"></div>
      <div style="position:relative;width:24px;height:24px">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      </div>
      <span class="nav-label">מוצרים</span>
    </div>
    <div class="nav-item" id="nav-orders" data-tab="orders">
      <div class="nav-indicator"></div>
      <div style="position:relative;width:24px;height:24px">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
        <span class="nav-badge" id="orders-badge">!</span>
      </div>
      <span class="nav-label">מודעה</span>
    </div>
    <div class="nav-item" id="nav-profile" data-tab="profile">
      <div class="nav-indicator"></div>
      <div style="position:relative;width:24px;height:24px">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <span class="nav-label">פרופיל</span>
    </div>
  </nav>

  <button class="fab" id="fab-add-product" type="button" aria-label="הוסף תוצרת">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </button>

</div><!-- /app -->

<!-- ADD PRODUCT MODAL -->
<div class="modal-overlay" id="addProductModal">
  <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="add-product-title">
    <div class="modal-handle"></div>
    <div class="modal-title" id="add-product-title">הוסף תוצרת חדשה</div>
    <div class="modal-body">
      <div class="field">
        <label for="new-catalog-id">בחר תוצרת מהקטלוג *</label>
        <div class="farmer-produce-picker" aria-label="קטלוג תוצרת לבחירת חקלאי">
          <label class="farmer-picker-search" for="new-produce-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input type="search" id="new-produce-search" autocomplete="off" placeholder="חפש עגבנייה, מלפפון, לימון..." />
          </label>
          <div class="farmer-picker-tabs" id="farmer-picker-tabs" aria-label="קטגוריות תוצרת"></div>
          <div class="farmer-picker-grid" id="farmer-picker-grid"></div>
        </div>
        <select id="new-catalog-id" class="produce-select-fallback" aria-label="בחירת תוצרת מהקטלוג"></select>
        <div class="produce-select-preview" id="new-produce-preview" aria-live="polite"></div>
      </div>
      <div class="field"><label for="new-name">שם לתצוגה</label><input type="text" id="new-name" placeholder="למשל: מלפפון חממה"></div>
      <div class="field-row">
        <div class="field"><label for="new-price">מחיר *</label><input type="number" id="new-price" placeholder="₪"></div>
        <div class="field"><label for="new-unit">יחידה</label>
          <select id="new-unit"><option>לק״ג</option><option>ליחידה</option><option>לצרור</option><option>לסלסלה</option><option>לשקית</option><option>לראש</option></select>
        </div>
      </div>
      <div class="field"><label for="new-qty">כמות זמינה</label><input type="text" id="new-qty" placeholder='50 ק"ג השבוע'></div>
      <div class="field"><label for="new-note">הערות (לא חובה)</label><textarea id="new-note" rows="2" placeholder="אורגני, נקטף אתמול..."></textarea></div>
      <button class="btn-shine" id="confirm-add-product" type="button">הוסף ללוח ←</button>
      <button class="btn-cancel-modal" id="cancel-add-product" type="button">ביטול</button>
    </div>
  </div>
</div>

<!-- AUTH OVERLAY -->
<div class="auth-overlay" id="auth-overlay" style="display:none" role="dialog" aria-modal="true" aria-labelledby="auth-title">
  <div class="auth-card">
    <div class="auth-logo">🌾</div>
    <div class="auth-title" id="auth-title">כניסה לחקלאי</div>
    <div class="auth-sub" id="auth-sub">הזן אימייל וסיסמה כדי לנהל את המשק שלך</div>
    <input type="email" id="auth-email" class="auth-input" placeholder="אימייל" autocomplete="email">
    <input type="password" id="auth-password" class="auth-input" placeholder="סיסמה" autocomplete="current-password">
    <div class="auth-error" id="auth-error"></div>
    <button class="auth-btn" id="auth-submit" type="button">כניסה</button>
    <a class="auth-apply-link" href="#apply">עדיין לא חקלאי בגזרוני? הגש בקשת הצטרפות</a>
    <button class="auth-skip" id="auth-skip" type="button">המשך ללא כניסה (טיוטה מקומית)</button>
    <a class="auth-home-link" href="#home">← חזרה לדף הבית</a>
  </div>
</div>

<!-- REVIEWS MODAL -->
<div class="modal-overlay" id="reviewsModal">
  <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="reviews-title">
    <div class="modal-handle"></div>
    <div class="modal-title" id="reviews-title">חוות דעת של תושבים מהאזור</div>
    <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
      <div style="border-bottom:1px solid rgba(0,0,0,0.08);padding:12px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-weight:700">גילה כהן (כפר ויתקין)</span>
          <span style="color:#f59e0b">⭐⭐⭐⭐⭐</span>
        </div>
        <p style="margin:0;font-size:14px;color:var(--text-2)">העגבניות שרי שלכם פשוט מתוקות כמו סוכריות, הילדים שלי לא מפסיקים לאכול אותן!</p>
      </div>
      <div style="border-bottom:1px solid rgba(0,0,0,0.08);padding:12px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-weight:700">אהרון (בת חפר)</span>
          <span style="color:#f59e0b">⭐⭐⭐⭐⭐</span>
        </div>
        <p style="margin:0;font-size:14px;color:var(--text-2)">השום טרי ומצוין, סוף סוף שום ישראלי אמיתי באיכות מנצחת.</p>
      </div>
      <div style="padding:12px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-weight:700">רעות שדה (עולש)</span>
          <span style="color:#f59e0b">⭐⭐⭐⭐⭐</span>
        </div>
        <p style="margin:0;font-size:14px;color:var(--text-2)">שירות אדיב, כיף לבוא למשק שלכם ולאסוף ישירות מהשדה.</p>
      </div>
      <button class="btn-cancel-modal" id="close-reviews-btn" type="button" style="margin-top:16px">סגור</button>
    </div>
  </div>
</div>

<!-- INQUIRIES MODAL -->
<div class="modal-overlay" id="inquiriesModal">
  <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="inquiries-title">
    <div class="modal-handle"></div>
    <div class="modal-title" id="inquiries-title">פניות מתושבי האזור החודש</div>
    <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:14px">פנייה מוואטסאפ: מיכל (מכמורת)</div>
            <div style="font-size:12px;color:var(--text-3)">התעניינה ב-3 ק״ג מלפפון וגזר</div>
          </div>
          <span style="font-size:12px;color:var(--text-3)">לפני שעתיים</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:14px">שיחה נכנסת: דניאל (בת חפר)</div>
            <div style="font-size:12px;color:var(--text-3)">ביקש שעות פתיחה לאיסוף בשישי</div>
          </div>
          <span style="font-size:12px;color:var(--text-3)">אתמול</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:14px">פנייה מוואטסאפ: יוסי (חופית)</div>
            <div style="font-size:12px;color:var(--text-3)">הזמנה גדולה של ירקות ועלים ירוקים</div>
          </div>
          <span style="font-size:12px;color:var(--text-3)">לפני 3 ימים</span>
        </div>
      </div>
      <button class="btn-cancel-modal" id="close-inquiries-btn" type="button" style="margin-top:16px">סגור</button>
    </div>
  </div>
</div>

<!-- SATISFACTION MODAL -->
<div class="modal-overlay" id="satisfactionModal">
  <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="satisfaction-title">
    <div class="modal-handle"></div>
    <div class="modal-title" id="satisfaction-title">איך מחושבת שביעות הרצון?</div>
    <div class="modal-body" style="text-align:center">
      <div style="font-size:48px;margin-bottom:12px">❤️</div>
      <p style="font-size:15px;line-height:1.6;color:var(--text-2);margin-bottom:20px">
        שביעות הרצון מבוססת על משוב חוזר של תושבים שקנו ישירות מהמשק שלכם.
        <br><strong style="color:var(--green-900)">94% מהקונים דיווחו על חוויה מעולה!</strong>
      </p>
      <p style="font-size:13px;color:var(--text-3)">
        טיפ: מענה מהיר בוואטסאפ ועדכון זמינות התוצרת בלוח שומרים על ציון שביעות רצון גבוה.
      </p>
      <button class="btn-cancel-modal" id="close-satisfaction-btn" type="button" style="margin-top:16px">סגור</button>
    </div>
  </div>
</div>
  `;
}

// ─── tab navigation ──────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('screen-' + currentTab)?.classList.remove('active');
  document.getElementById('nav-' + currentTab)?.classList.remove('active');
  currentTab = tab;
  document.getElementById('screen-' + tab)?.classList.add('active');
  document.getElementById('nav-' + tab)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  const fab = document.getElementById('fab-add-product');
  if (fab) {
    if (tab === 'products') {
      fab.classList.add('show');
    } else {
      fab.classList.remove('show');
    }
  }
}

function bindNavTabs() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  document.getElementById('go-listing')?.addEventListener('click', () => switchTab('orders'));
  document.getElementById('go-listing-2')?.addEventListener('click', () => switchTab('orders'));
  document.getElementById('go-listing-3')?.addEventListener('click', () => switchTab('orders'));
  document.getElementById('go-products')?.addEventListener('click', () => switchTab('products'));
  document.getElementById('go-products-2')?.addEventListener('click', () => switchTab('products'));
  document.getElementById('qa-add-produce')?.addEventListener('click', openAddProductModal);
  document.getElementById('qa-edit-listing')?.addEventListener('click', () => switchTab('orders'));
  document.getElementById('fab-add-product')?.addEventListener('click', openAddProductModal);
  document.getElementById('stat-card-products')?.addEventListener('click', () => switchTab('products'));
  document.getElementById('dash-notif-btn')?.addEventListener('click', () => showToast('אין התראות חדשות', 'info'));
  document.getElementById('si-edit')?.addEventListener('click', () => switchTab('orders'));
  document.getElementById('si-notif')?.addEventListener('click', () => showToast('התראות — בקרוב', 'info'));
  document.getElementById('si-signout')?.addEventListener('click', signOut);

  // Profile page interactive stats & modals
  document.getElementById('pc-rating')?.addEventListener('click', () => openProfileModal('reviewsModal'));
  document.getElementById('pc-inquiries')?.addEventListener('click', () => openProfileModal('inquiriesModal'));
  document.getElementById('pc-satisfaction')?.addEventListener('click', () => openProfileModal('satisfactionModal'));
  document.getElementById('btn-share-farm')?.addEventListener('click', shareFarmListing);

  // Close modals listeners
  document.getElementById('close-reviews-btn')?.addEventListener('click', () => closeProfileModal('reviewsModal'));
  document.getElementById('close-inquiries-btn')?.addEventListener('click', () => closeProfileModal('inquiriesModal'));
  document.getElementById('close-satisfaction-btn')?.addEventListener('click', () => closeProfileModal('satisfactionModal'));

  document.getElementById('reviewsModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('reviewsModal')) closeProfileModal('reviewsModal');
  });
  document.getElementById('inquiriesModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('inquiriesModal')) closeProfileModal('inquiriesModal');
  });
  document.getElementById('satisfactionModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('satisfactionModal')) closeProfileModal('satisfactionModal');
  });
}

function bindListingTabs() {
  document.querySelectorAll('.otab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.otab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.order-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('otab-' + tab.dataset.otab)?.classList.add('active');
    });
  });
  document.getElementById('save-draft-btn')?.addEventListener('click', saveFarmListing);
  document.getElementById('save-availability-btn')?.addEventListener('click', saveFarmListing);
}

// ─── chart ───────────────────────────────────────────────────────────────────
function initChart() {
  const data = [95, 140, 80, 210, 175, 260, 270];
  const days = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'];
  const max = Math.max(...data);
  const barsEl = document.getElementById('revenueChart');
  const labelsEl = document.getElementById('chartLabels');
  if (!barsEl || !labelsEl) return;
  data.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar' + (i === data.length - 1 ? ' highlight' : '');
    bar.style.height = '0'; bar.style.flex = '1';
    bar.title = v + ' צפיות';
    barsEl.appendChild(bar);
    setTimeout(() => { bar.style.height = Math.round((v / max) * 52) + 'px'; }, 200 + i * 60);
    const lbl = document.createElement('div');
    lbl.textContent = days[i];
    labelsEl.appendChild(lbl);
  });
}

// ─── animated counter ─────────────────────────────────────────────────────────
function animateCounter(el, from, to, prefix, suffix, duration) {
  if (!el) return;
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + Math.round(from + (to - from) * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── marquee ─────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  { dot: 'green',  text: 'עגבניות שרי עודכנו ל-₪9 לק״ג' },
  { dot: 'blue',   text: '124 אנשים צפו במודעת המשק היום' },
  { dot: 'green',  text: 'גזר ועשבי תיבול מסומנים כזמינים' },
  { dot: 'orange', text: 'עמק חפר — 15 משקים פעילים' },
  { dot: 'green',  text: 'טלפון ווואטסאפ מוכנים להצגה בלוח' },
  { dot: 'blue',   text: 'הפרופיל שלך דורג ⭐4.9 השבוע' },
  { dot: 'green',  text: 'מחירי השבוע נשמרו כטיוטה מקומית' },
  { dot: 'orange', text: 'תזכורת: עדכן זמינות לפני סוף השבוע' },
];

function initMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  function buildGroup(ariaHidden) {
    const group = document.createElement('div');
    group.className = 'marquee-group';
    if (ariaHidden) group.setAttribute('aria-hidden', 'true');
    MARQUEE_ITEMS.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'marquee-chip';
      const dot = document.createElement('span');
      dot.className = 'chip-dot ' + item.dot;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(item.text));
      group.appendChild(chip);
    });
    return group;
  }
  track.appendChild(buildGroup(false));
  track.appendChild(buildGroup(true));
}

// ─── live ticker ──────────────────────────────────────────────────────────────
const TICKER_EVENTS = [
  { label: 'עדכון מחירים',  text: 'תושבים רואים קודם כל תוצרת ומחיר ברור',             badge: 'שקוף' },
  { label: 'צפייה בפרופיל', text: '12 אנשים צפו במודעת המשק בשעה האחרונה',            badge: '+12'  },
  { label: 'זמינות',         text: 'גזר ועשבי תיבול מסומנים כזמינים השבוע',            badge: 'זמין' },
  { label: 'אמון',           text: 'פרטי קשר מלאים מעלים את הסיכוי לפנייה',           badge: 'מוכן' },
  { label: 'מיקום',          text: 'סינון מיקום חכם יוכל להשתמש בעתיד באזור וביישוב', badge: 'DB'   },
];
let tickerIdx = 0;

function initTicker() {
  tickerTimer = setInterval(() => {
    tickerIdx = (tickerIdx + 1) % TICKER_EVENTS.length;
    const ev = TICKER_EVENTS[tickerIdx];
    const label = document.querySelector('.ticker-label');
    const text  = document.getElementById('tickerText');
    const badge = document.getElementById('tickerBadge');
    if (!label || !text || !badge) return;
    text.style.opacity = '0'; text.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      label.textContent = ev.label; text.textContent = ev.text; badge.textContent = ev.badge;
      text.style.transition = 'all 0.35s var(--spring)';
      text.style.opacity = '1'; text.style.transform = 'translateY(0)';
    }, 220);
  }, 4000);
}

// ─── farm draft ───────────────────────────────────────────────────────────────
function applyFarmDraft() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('listing-farm-name',    farmDraft.farmName);
  set('listing-farmer-name',  farmDraft.farmerName);
  set('listing-city',         farmDraft.city);
  set('listing-phone',        farmDraft.phone);
  set('listing-availability', farmDraft.availability);
  set('listing-pickup',       farmDraft.pickup);
  set('listing-hours',        farmDraft.hours);
  set('listing-directions',   farmDraft.directions);
  set('listing-note',         farmDraft.note);
  const regionSel = document.getElementById('listing-region');
  if (regionSel) {
    [...regionSel.options].forEach(o => { o.selected = o.value === farmDraft.region; });
    if (!regionSel.value) regionSel.selectedIndex = 0;
  }
  const sn = document.getElementById('status-name');
  if (sn) sn.textContent = farmDraft.farmName || 'שם המשק טרם הוגדר';
  const pn = document.getElementById('profile-name');
  if (pn) pn.textContent = farmDraft.farmName || 'שם המשק טרם הוגדר';
  const ps = document.getElementById('profile-sub');
  const subParts = [farmDraft.farmerName, farmDraft.region].filter(Boolean);
  if (ps) ps.textContent = subParts.length ? subParts.join(' · ') : 'מלא את פרטי המשק';
  renderListingPreview();
}

function collectFarmDraft() {
  return {
    farmName:     document.getElementById('listing-farm-name')?.value.trim()    || '',
    farmerName:   document.getElementById('listing-farmer-name')?.value.trim()  || '',
    region:       document.getElementById('listing-region')?.value              || '',
    city:         document.getElementById('listing-city')?.value.trim()         || '',
    phone:        document.getElementById('listing-phone')?.value.trim()        || '',
    availability: document.getElementById('listing-availability')?.value.trim() || '',
    pickup:       document.getElementById('listing-pickup')?.value.trim()       || '',
    hours:        document.getElementById('listing-hours')?.value.trim()        || '',
    directions:   document.getElementById('listing-directions')?.value.trim()   || '',
    note:         document.getElementById('listing-note')?.value.trim()         || '',
  };
}

async function saveFarmListing() {
  const next = collectFarmDraft();
  if (!next.farmName || !next.farmerName || !next.phone) {
    showToast('נא למלא שם משק, שם חקלאי וטלפון', 'warning'); return;
  }
  farmDraft = next;
  writeDraft(farmDraft);
  applyFarmDraft();

  if (currentUser) {
    const ok = await saveFarmToDb(farmDraft, dashProducts);
    showToast(ok ? 'המודעה נשמרה ופורסמה בלוח ✓' : 'נשמר מקומית (שגיאת שרת)', ok ? 'success' : 'warning');
  } else {
    showToast('טיוטת המודעה נשמרה מקומית ✓', 'success');
  }
}

function renderListingPreview() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('listing-preview-name',   farmDraft.farmName   || DEFAULT_FARM_DRAFT.farmName);
  set('listing-preview-region', (farmDraft.region || DEFAULT_FARM_DRAFT.region) + ' · ' + (farmDraft.city || DEFAULT_FARM_DRAFT.city));
  set('listing-preview-note',   farmDraft.note        || DEFAULT_FARM_DRAFT.note);
  set('listing-preview-phone',  farmDraft.phone       || DEFAULT_FARM_DRAFT.phone);
}

// ─── products ─────────────────────────────────────────────────────────────────
const PRODUCE_CATEGORY_ORDER = ['vegetables', 'fruit', 'greens', 'roots', 'herbs'];
const EMOJI_MAP = {
  'עגבניות': '🍅', 'מלפפון': '🥒', 'גזר': '🥕', 'פלפל': '🫑',
  'חסה': '🥬', 'תירס': '🌽', 'בצל': '🧅', 'שום': '🧄', 'תפוח': '🍎',
  'ענבים': '🍇', 'לימון': '🍋', 'אבוקדו': '🥑', 'תות': '🍓',
  'אבטיח': '🍉', 'זית': '🫒', 'עשבי': '🌿', 'ביצ': '🥚', 'תפו': '🥔',
};
function getEmoji(name) {
  for (const k in EMOJI_MAP) { if (name.includes(k)) return EMOJI_MAP[k]; }
  return '🌾';
}

function buildProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  if (!product.active) card.style.opacity = '0.6';

  const visual = document.createElement('div');
  visual.className = 'product-emoji product-asset-wrap';
  const image = document.createElement('img');
  image.className = 'product-asset-image';
  const productImgUrl = getProductImageUrl(product);
  image.src = productImgUrl || getProduceImageSrc(product);
  image.alt = getProduceAlt(product);
  image.loading = 'lazy';
  image.onerror = () => {
    image.remove();
    visual.textContent = product.icon || getEmoji(product.name);
  };
  visual.appendChild(image);
  card.appendChild(visual);

  const info = document.createElement('div');
  info.className = 'product-info';
  const nm = document.createElement('div'); nm.className = 'product-name'; nm.textContent = product.name; info.appendChild(nm);
  const mt = document.createElement('div'); mt.className = 'product-meta'; mt.textContent = product.qty || 'זמינות תתעדכן'; info.appendChild(mt);
  const pr = document.createElement('div'); pr.className = 'product-price'; pr.textContent = '₪' + product.price + ' ' + (product.unit || ''); info.appendChild(pr);
  card.appendChild(info);

  const right = document.createElement('div');
  right.className = 'product-right';
  const badge = document.createElement('span');
  badge.className = 'badge ' + (product.active ? 'active' : 'paused');
  badge.textContent = product.active ? 'פעיל' : 'מושהה';
  right.appendChild(badge);

  const label = document.createElement('label');
  label.className = 'toggle';
  const input = document.createElement('input');
  input.type = 'checkbox'; input.checked = product.active;
  input.addEventListener('change', () => toggleProduct(product.id, input.checked));
  const track = document.createElement('span'); track.className = 'toggle-track';
  const thumb = document.createElement('span'); thumb.className = 'toggle-thumb';
  label.append(input, track, thumb);
  right.appendChild(label);
  card.appendChild(right);

  // Edit toggle button
  const editToggle = document.createElement('button');
  editToggle.className = 'product-edit-toggle';
  editToggle.type = 'button';
  editToggle.textContent = 'עריכה ▾';

  // Edit panel
  const editPanel = document.createElement('div');
  editPanel.className = 'product-edit-panel';
  editPanel.hidden = true;

  // Image upload label
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
}

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

function toggleProduct(id, isActive) {
  const product = dashProducts.find(p => p.id === id);
  if (!product) return;
  product.active = isActive;
  writeProducts(dashProducts);
  renderProducts();
  if (currentUser) saveFarmToDb(farmDraft, dashProducts);
  showToast(product.name + (isActive ? ' הופעל ✓' : ' הושהה'), 'success');
}

function updateStats(skipViews) {
  const active = dashProducts.filter(p => p.active);
  const prices = active.map(p => Number(p.price)).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const so = document.getElementById('stat-orders');
  const sr = document.getElementById('stat-revenue');
  if (so) so.textContent = active.length;
  if (sr) sr.textContent = minPrice ? '₪' + minPrice : '—';
}

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
    if (!currentUser) showToast('תמונה נשמרה ✓', 'success');

    if (currentUser) {
      const db = getDb();
      if (!db) return;
      const product = dashProducts.find(p => p.id === productId);
      const ext = file.name.split('.').pop().toLowerCase().replace('jpg', 'jpeg') || 'jpeg';
      const mime = ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
      const path = `${currentUser.id}/${productId}.${ext}`;
      const { error } = await db.storage.from('produce-images').upload(path, file, { contentType: mime, upsert: true });
      if (error) {
        console.error('[gezroni] produce image upload failed', error);
        showToast('שגיאה בהעלאת תמונה לענן — ' + error.message, 'error');
        return;
      }
      const url = db.storage.from('produce-images').getPublicUrl(path).data?.publicUrl;
      if (url && product) {
        product.imageUrl = url;
        writeProducts(dashProducts);
        renderProducts();
        const saved = await saveFarmToDb(farmDraft, dashProducts);
        if (saved) showToast('התמונה הועלתה ותוצג בלוח המשקים ✓', 'success');
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

// ─── add product modal ────────────────────────────────────────────────────────
function selectOptionByValue(select, value) {
  if (!select || !value) return false;
  const option = [...select.options].find(opt => opt.value === value);
  if (!option) return false;
  select.value = value;
  return true;
}

function populateProduceCatalogSelect() {
  const select = document.getElementById('new-catalog-id');
  if (!select || select.dataset.ready === '1') return;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'בחרו פרי, ירק או עשב תיבול';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  const catalog = getProduceCatalog();
  PRODUCE_CATEGORY_ORDER.forEach(category => {
    const items = catalog
      .filter(item => item.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
    if (!items.length) return;

    const group = document.createElement('optgroup');
    group.label = getProduceCategoryLabel(category);
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      option.dataset.unit = item.unit || '';
      group.appendChild(option);
    });
    select.appendChild(group);
  });

  select.dataset.ready = '1';
}

function getFilteredPickerItems() {
  const search = (document.getElementById('new-produce-search')?.value || '').trim().toLowerCase();
  return getProduceCatalog()
    .filter(item => farmerPickerCategory === 'all' || item.category === farmerPickerCategory)
    .filter(item => {
      if (!search) return true;
      return item.name.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search) ||
        (item.aliases || []).some(alias => String(alias).toLowerCase().includes(search));
    })
    .sort((a, b) => {
      const categoryDelta = PRODUCE_CATEGORY_ORDER.indexOf(a.category) - PRODUCE_CATEGORY_ORDER.indexOf(b.category);
      if (categoryDelta !== 0) return categoryDelta;
      return a.name.localeCompare(b.name, 'he');
    });
}

function renderFarmerPickerTabs() {
  const tabs = document.getElementById('farmer-picker-tabs');
  if (!tabs) return;
  const catalog = getProduceCatalog();
  const categories = ['all', ...PRODUCE_CATEGORY_ORDER.filter(category => catalog.some(item => item.category === category))];

  tabs.innerHTML = categories.map(category => `
    <button class="farmer-picker-tab${category === farmerPickerCategory ? ' active' : ''}" type="button" data-category="${category}">
      ${category === 'all' ? 'הכל' : getProduceCategoryLabel(category)}
    </button>
  `).join('');

  tabs.querySelectorAll('.farmer-picker-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      farmerPickerCategory = tab.dataset.category || 'all';
      renderFarmerProducePicker();
    });
  });
}

function renderFarmerProducePicker() {
  renderFarmerPickerTabs();
  const grid = document.getElementById('farmer-picker-grid');
  const select = document.getElementById('new-catalog-id');
  if (!grid || !select) return;

  const items = getFilteredPickerItems();
  if (!items.length) {
    grid.innerHTML = `<div class="farmer-picker-empty">לא נמצאה תוצרת מתאימה לחיפוש</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const active = select.value === item.id;
    return `
      <button class="farmer-produce-option${active ? ' active' : ''}" type="button" data-produce-id="${item.id}" aria-pressed="${active ? 'true' : 'false'}">
        <img src="${getProduceImageSrc(item)}" alt="${item.name}" loading="lazy">
        <span>${item.name}</span>
        <small>${catalogUnitToDisplayUnit(item.unit)}</small>
      </button>`;
  }).join('');

  grid.querySelectorAll('.farmer-produce-option').forEach(button => {
    button.addEventListener('click', () => {
      select.value = button.dataset.produceId || '';
      updateProduceSelection(true);
      syncFarmerPickerActive(select.value);
    });
  });
}

function syncFarmerPickerActive(produceId) {
  document.querySelectorAll('.farmer-produce-option').forEach(button => {
    const active = button.dataset.produceId === produceId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function setUnitFromCatalog(item) {
  const unitSelect = document.getElementById('new-unit');
  if (!unitSelect || !item) return;
  const displayUnit = catalogUnitToDisplayUnit(item.unit);
  if (!selectOptionByValue(unitSelect, displayUnit)) {
    const option = document.createElement('option');
    option.value = displayUnit;
    option.textContent = displayUnit;
    unitSelect.appendChild(option);
    unitSelect.value = displayUnit;
  }
}

function updateProduceSelection(syncName = false) {
  const select = document.getElementById('new-catalog-id');
  const preview = document.getElementById('new-produce-preview');
  const nameInput = document.getElementById('new-name');
  const item = getProduceById(select?.value);

  if (!preview) return;
  preview.innerHTML = '';
  if (!select?.value || !item) {
    preview.textContent = 'בחרו מוצר מהרשימה כדי לראות תמונה ויחידת מחיר.';
    preview.classList.remove('active');
    return;
  }

  preview.classList.add('active');
  const image = document.createElement('img');
  image.src = getProduceImageSrc(item);
  image.alt = item.name;
  preview.appendChild(image);

  const text = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = item.name;
  const meta = document.createElement('span');
  meta.textContent = `${getProduceCategoryLabel(item.category)} · ${catalogUnitToDisplayUnit(item.unit)}`;
  text.append(title, meta);
  preview.appendChild(text);

  if (syncName && nameInput && (!nameInput.value.trim() || nameInput.dataset.autofilled === '1')) {
    nameInput.value = item.name;
    nameInput.dataset.autofilled = '1';
  }
  setUnitFromCatalog(item);
  syncFarmerPickerActive(item.id);
}

function openAddProductModal() {
  populateProduceCatalogSelect();
  renderFarmerProducePicker();
  document.getElementById('addProductModal')?.classList.add('open');
  updateProduceSelection(false);
  setTimeout(() => document.getElementById('new-produce-search')?.focus(), 350);
}

function closeAddProductModal() {
  document.getElementById('addProductModal')?.classList.remove('open');
}

function openProfileModal(modalId) {
  document.getElementById(modalId)?.classList.add('open');
}

function closeProfileModal(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}

function shareFarmListing() {
  const farmName = farmDraft.farmName || 'משק ישראלי';
  const farmId = currentUser ? 'farm-' + currentUser.id.slice(0, 8) : '';
  const shareUrl = `${window.location.origin}/#market?farm=${farmId}`;
  const shareText = `שלום! מוזמנים לבקר בעמוד של ${farmName} בלוח המשקים גזרוני, לעקוב אחר זמינות התוצרת ולקנות ישירות מאיתנו: ${shareUrl}`;

  if (navigator.share) {
    navigator.share({
      title: farmName,
      text: shareText,
      url: shareUrl
    }).catch(e => console.log('Share failed', e));
  } else {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('הקישור הועתק! פותח וואטסאפ לשיתוף...', 'success');
      setTimeout(() => window.open(waUrl, '_blank'), 800);
    }).catch(() => {
      window.open(waUrl, '_blank');
    });
  }
}

function bindAddProductModal() {
  document.getElementById('addProductModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('addProductModal')) closeAddProductModal();
  });
  populateProduceCatalogSelect();
  renderFarmerProducePicker();
  document.getElementById('new-catalog-id')?.addEventListener('change', () => {
    updateProduceSelection(true);
    renderFarmerProducePicker();
  });
  document.getElementById('new-produce-search')?.addEventListener('input', () => renderFarmerProducePicker());
  document.getElementById('new-name')?.addEventListener('input', () => {
    const input = document.getElementById('new-name');
    if (input) input.dataset.autofilled = '0';
  });
  document.getElementById('cancel-add-product')?.addEventListener('click', closeAddProductModal);
  document.getElementById('confirm-add-product')?.addEventListener('click', () => {
    const catalogId = document.getElementById('new-catalog-id')?.value;
    const catalogItem = getProduceById(catalogId);
    const name  = document.getElementById('new-name')?.value.trim() || catalogItem?.name || '';
    const price = document.getElementById('new-price')?.value.trim();
    const unit  = document.getElementById('new-unit')?.value;
    const qty   = document.getElementById('new-qty')?.value.trim();
    if (!catalogId || !price) { showToast('נא לבחור תוצרת ולמלא מחיר', 'warning'); return; }
    dashProducts.unshift({
      id: 'product-' + Date.now(),
      catalogId: catalogItem?.id || catalogId,
      category: catalogItem?.category || 'vegetables',
      name,
      price,
      unit,
      qty: qty || 'נוסף עכשיו',
      active: true,
    });
    writeProducts(dashProducts);
    renderProducts();
    if (currentUser) saveFarmToDb(farmDraft, dashProducts);
    closeAddProductModal();
    showToast(name + ' נוסף ללוח ✓', 'success');
    ['new-catalog-id', 'new-name', 'new-price', 'new-qty', 'new-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = '';
        if (id === 'new-name') el.dataset.autofilled = '0';
      }
    });
    const search = document.getElementById('new-produce-search');
    if (search) search.value = '';
    farmerPickerCategory = 'all';
    renderFarmerProducePicker();
    updateProduceSelection(false);
    switchTab('products');
  });
}

// ─── auth ─────────────────────────────────────────────────────────────────────
let authMode = 'login';

async function initAuth() {
  const db = getDb();
  if (!db) { showAuthOverlay(); return; }
  const { data: { session } } = await db.auth.getSession();
  if (abortController?.signal.aborted) return;
  if (session?.user) {
    currentUser = session.user;
    await loadFarmFromDb(currentUser);
    loadFarmPhotos();
    applyAdminBadge(currentUser);
  } else {
    showAuthOverlay();
  }
  db.auth.onAuthStateChange((_e, s) => { currentUser = s?.user || null; });
}

function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'flex';
  bindAuthOverlay();
}

function bindAuthOverlay() {
  document.getElementById('auth-submit')?.addEventListener('click', handleAuthSubmit);
  document.getElementById('auth-skip')?.addEventListener('click', () => {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
  });
  document.getElementById('auth-toggle')?.addEventListener('click', () => {
    authMode = authMode === 'login' ? 'signup' : 'login';
    const isSignup = authMode === 'signup';
    const title = document.getElementById('auth-title');
    const sub   = document.getElementById('auth-sub');
    const btn   = document.getElementById('auth-submit');
    const tog   = document.getElementById('auth-toggle');
    if (title) title.textContent = isSignup ? 'הרשמה כחקלאי' : 'כניסה לחקלאי';
    if (sub)   sub.textContent   = isSignup ? 'צור חשבון חדש עם אימייל וסיסמה' : 'הזן אימייל וסיסמה כדי לנהל את המשק שלך';
    if (btn)   btn.textContent   = isSignup ? 'הרשמה' : 'כניסה';
    if (tog)   tog.textContent   = isSignup ? 'כבר יש לך חשבון? כניסה' : 'אין לך חשבון? הרשם';
    const errEl = document.getElementById('auth-error');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  });
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function handleAuthSubmit() {
  const db = getDb();
  if (!db) { showAuthError('שגיאת חיבור לשרת — נסה שוב'); return; }
  const email    = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!email || !password) { showAuthError('נא למלא אימייל וסיסמה'); return; }

  const btn = document.getElementById('auth-submit');
  if (btn) { btn.textContent = '...'; btn.disabled = true; }

  const result = authMode === 'login'
    ? await db.auth.signInWithPassword({ email, password })
    : await db.auth.signUp({ email, password });

  if (btn) { btn.disabled = false; btn.textContent = authMode === 'login' ? 'כניסה' : 'הרשמה'; }

  if (result.error) {
    let msg = result.error.message;
    if (msg.includes('Invalid login credentials')) msg = 'אימייל או סיסמה שגויים';
    if (msg.includes('already registered'))        msg = 'האימייל כבר רשום — נסה להיכנס';
    if (msg.includes('Password should'))           msg = 'סיסמה חייבת להכיל לפחות 6 תווים';
    showAuthError(msg); return;
  }

  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  showToast(authMode === 'signup' ? 'ברוך הבא! בדוק את האימייל לאישור ✓' : 'כניסה בוצעה בהצלחה ✓', 'success');
  if (authMode === 'login') {
    currentUser = result.data?.user || null;
    await loadFarmFromDb(currentUser);
    loadFarmPhotos();
    resolveHeroImage();
    applyAdminBadge(currentUser);
  }
}

async function signOut() {
  const db = getDb();
  if (db) await db.auth.signOut();
  currentUser = null;
  showToast('יצאת מהחשבון', 'info');
  setTimeout(() => showAuthOverlay(), 900);
}

// ─── Supabase save / load ─────────────────────────────────────────────────────
async function loadFarmFromDb(user) {
  const db = getDb();
  if (!db || !user) return;
  try {
    const { data: row, error } = await db.from('farms').select('*, produce(*)').eq('user_id', user.id).maybeSingle();

    if (!row) {
      // No farm yet — pre-populate from their application
      const { data: app } = await db
        .from('farm_applications')
        .select('*')
        .eq('applicant_email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (app) {
        farmDraft = {
          ...DEFAULT_FARM_DRAFT,
          farmName:   app.farm_name       || '',
          farmerName: app.applicant_name  || '',
          region:     app.region          || '',
          city:       app.city            || '',
          phone:      app.contact?.phone  || app.applicant_phone || '',
        };
        writeDraft(farmDraft);
        applyFarmDraft();
      }
      return;
    }

    if (error) return;

    farmDraft = {
      farmName:     row.name                          || '',
      farmerName:   row.farmer_name                   || '',
      region:       row.region                        || '',
      city:         row.city                          || '',
      phone:        row.contact?.phone                || '',
      availability: row.availability                  || '',
      pickup:       row.pickup                        || '',
      hours:        row.working_hours?.text           || '',
      directions:   row.directions                    || '',
      note:         row.story                         || '',
      lat:          row.lat   != null ? Number(row.lat)  : null,
      lng:          row.lng   != null ? Number(row.lng)  : null,
    };
    writeDraft(farmDraft);
    applyFarmDraft();

    if (row.produce?.length) {
      dashProducts = row.produce.map(p => ({
        catalogId: getProduceById(p.catalog_id || p.id || p.name)?.id || '',
        id: p.id, name: p.name, price: String(p.price),
        unit: 'ל' + (p.unit || ''), qty: p.availability || '',
        active: true, icon: p.icon || '',
        imageUrl: p.image_url || '',
        category: p.category || getProduceById(p.catalog_id || p.id || p.name)?.category || 'vegetables',
      })).map(normalizeProduct);
      writeProducts(dashProducts);
      renderProducts();
    }
  } catch (e) {
    console.warn('[gezroni] loadFarmFromDb failed', e);
  }
}

async function saveFarmToDb(draft, products) {
  const db = getDb();
  if (!db || !currentUser) return false;
  const farmId = 'farm-' + currentUser.id.slice(0, 8);

  let lat = draft.lat ?? null;
  let lng = draft.lng ?? null;
  if ((lat == null || lng == null) && (draft.city || draft.region)) {
    const coords = await geocodeFarmCity(draft.city, draft.region);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      farmDraft = { ...farmDraft, lat, lng };
      writeDraft(farmDraft);
    }
  }

  const { error: fe } = await db.from('farms').upsert({
    id: farmId, user_id: currentUser.id,
    name: draft.farmName, farmer_name: draft.farmerName,
    region: draft.region, city: draft.city,
    availability: draft.availability || '', pickup: draft.pickup || '',
    story: draft.note || '', distance_km: 0,
    working_hours: draft.hours ? { text: draft.hours } : {},
    directions:    draft.directions || null,
    contact: { phone: draft.phone, whatsapp: (() => {
      const d = (draft.phone || '').replace(/\D/g, '');
      return d.startsWith('0') ? '972' + d.slice(1) : d;
    })() },
    tags: [], last_updated: new Date().toLocaleDateString('he-IL'),
    ...(lat != null && lng != null ? { lat, lng } : {}),
  });
  if (fe) { console.error('[gezroni] farm upsert', fe); return false; }

  const rows = products.filter(p => p.active).map(p => ({
    id: p.id, farm_id: farmId, name: p.name,
    catalog_id: p.catalogId || null,
    category: p.category || getProduceById(p.catalogId)?.category || 'vegetables',
    price: parseFloat(p.price) || 0,
    unit: (p.unit || '').replace(/^ל/, '').trim(),
    availability: p.qty || 'זמין', icon: p.icon || '', deal_key: null,
    image_url: p.imageUrl || null,
  }));
  await db.from('produce').delete().eq('farm_id', farmId);
  if (rows.length) {
    const { error: pe } = await db.from('produce').insert(rows);
    if (pe) { console.error('[gezroni] produce insert', pe); return false; }
  }
  return true;
}

// ─── photo upload ─────────────────────────────────────────────────────────────

async function loadFarmPhotos() {
  const db = getDb();
  if (!db || !currentUser) return;
  const farmId = 'farm-' + currentUser.id.slice(0, 8);
  const { data } = await db.from('farm_images').select('*').eq('farm_id', farmId).order('sort_order').order('created_at');
  renderPhotoGrid(data || []);
}

function renderPhotoGrid(images) {
  const grid = document.getElementById('farm-photos-grid');
  if (!grid) return;
  grid.innerHTML = images.map(img => {
    const db = getDb();
    const url = db?.storage.from('farm-images').getPublicUrl(img.storage_path).data?.publicUrl || '';
    return `
<div class="photo-thumb" data-img-id="${img.id}">
  <img src="${url}" alt="תמונת משק" loading="lazy">
  <button class="photo-delete-btn" data-img-id="${img.id}" data-path="${img.storage_path}" aria-label="מחק תמונה" type="button">✕</button>
  ${img.is_primary ? '<div class="photo-primary-badge">ראשית</div>' : ''}
</div>
`;
  }).join('');

  grid.querySelectorAll('.photo-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePhoto(btn.dataset.imgId, btn.dataset.path));
  });
}

async function handlePhotoInput(e) {
  const files = [...e.target.files];
  if (!files.length) return;
  const label = document.getElementById('farm-photo-label');
  if (label) { label.style.opacity = '0.5'; label.style.pointerEvents = 'none'; }

  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} גדולה מ-5MB`, 'warning'); continue; }
    await uploadPhoto(file);
  }

  if (label) { label.style.opacity = ''; label.style.pointerEvents = ''; }
  e.target.value = '';
  loadFarmPhotos();
}

async function ensureFarmExists(db) {
  const farmId = 'farm-' + currentUser.id.slice(0, 8);

  let lat = farmDraft.lat ?? null;
  let lng = farmDraft.lng ?? null;
  if ((lat == null || lng == null) && (farmDraft.city || farmDraft.region)) {
    const coords = await geocodeFarmCity(farmDraft.city, farmDraft.region);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      farmDraft = { ...farmDraft, lat, lng };
      writeDraft(farmDraft);
    }
  }

  await db.from('farms').upsert({
    id: farmId, user_id: currentUser.id,
    name:         farmDraft.farmName   || 'משק חדש',
    farmer_name:  farmDraft.farmerName || '',
    region:       farmDraft.region     || '',
    city:         farmDraft.city       || '',
    distance_km:  0,
    contact:      { phone: farmDraft.phone || '' },
    last_updated: new Date().toLocaleDateString('he-IL'),
    ...(lat != null && lng != null ? { lat, lng } : {}),
  }, { onConflict: 'id', ignoreDuplicates: true });
  return farmId;
}

async function uploadPhoto(file) {
  const db = getDb();
  if (!db || !currentUser) return;

  const ext    = file.name.split('.').pop().toLowerCase().replace('jpg', 'jpeg') || 'jpeg';
  const mime   = ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
  const path   = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: upErr } = await db.storage.from('farm-images').upload(path, file, { contentType: mime, upsert: false });
  if (upErr) { showToast('שגיאה בהעלאת תמונה — ' + upErr.message, 'error'); return; }

  // Ensure farm row exists (FK requirement) before inserting image record
  const farmId = await ensureFarmExists(db);

  const { error: dbErr } = await db.from('farm_images').insert({ farm_id: farmId, storage_path: path });
  if (dbErr) { showToast('שגיאה בשמירת תמונה — ' + dbErr.message, 'error'); }
}

async function deletePhoto(imgId, storagePath) {
  const db = getDb();
  if (!db) return;
  await db.storage.from('farm-images').remove([storagePath]);
  await db.from('farm_images').delete().eq('id', imgId);
  loadFarmPhotos();
}

function initPhotoUpload() {
  document.getElementById('farm-photo-input')?.addEventListener('change', handlePhotoInput);
  if (currentUser) loadFarmPhotos();
}

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
  e.target.disabled = true;
  if (file.size > 5 * 1024 * 1024) { showToast('התמונה גדולה מ-5MB', 'warning'); e.target.value = ''; e.target.disabled = false; return; }

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
      if (upErr) { console.error('Hero image upload failed:', upErr); showToast('שגיאה בהעלאה לענן', 'warning'); return; }
      // Mark as primary in DB
      await db.from('farm_images').upsert({ farm_id: farmId, storage_path: path, is_primary: true }, { onConflict: 'farm_id,storage_path' });
      // Remove old primary flags
      await db.from('farm_images').update({ is_primary: false }).eq('farm_id', farmId).neq('storage_path', path);
      const url = db.storage.from('farm-images').getPublicUrl(path).data?.publicUrl;
      if (url) { applyHeroImage(url); showToast('תמונה הועלתה לענן ✓', 'success'); }
    }
    e.target.disabled = false;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function initHeroUpload() {
  document.getElementById('hero-photo-input')?.addEventListener('change', handleHeroPhotoInput);
  resolveHeroImage();
}
