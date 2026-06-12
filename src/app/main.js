import { initShell, setRoute, setRootVariant } from './shell.js?v=20260612-firebase';
import { mountHome } from '../screens/home.js?v=20260612-magic-fx';
import { mountMarket } from '../screens/market.js?v=20260612-firebase';
import { mountDashboard } from '../screens/dashboard.js?v=20260612-firebase';
import { mountApply } from '../screens/apply.js?v=20260612-firebase';
import { mountAdmin } from '../screens/admin.js?v=20260612-firebase';
import { mountAccount } from '../screens/account.js?v=20260612-firebase';
import { readA11yState, applyA11yState } from '../lib/a11y.js';

const screenMounters = {
  home:      mountHome,
  market:    mountMarket,
  dashboard: mountDashboard,
  apply:     mountApply,
  admin:     mountAdmin,
  account:   mountAccount,
};

let currentCleanup = null;

function resolveRoute() {
  const raw = location.hash.replace('#', '') || 'home';
  return raw.split('?')[0];
}

const SCREEN_META = {
  home:      { title: 'גזרוני — השוואת מחירים', description: 'לוח משקים ישראלי למציאת חקלאים, תוצרת, מחירים ומיקום ללא רכישה באתר.' },
  market:    { title: 'גזרוני — לוח משקים והשוואת מחירים', description: 'מפה ולוח משקים למציאת תוצרת ישראלית, מחירים גלויים ופנייה ישירה לחקלאי.' },
  dashboard: { title: 'גזרוני — ניהול משק', description: 'ניהול מודעת משק: פרטי משק, תוצרת, מחירים, זמינות ופרטי קשר.' },
  apply:     { title: 'גזרוני — הצטרפות חקלאים', description: 'הגש בקשה לפרסם את המשק שלך בלוח גזרוני.' },
  admin:     { title: 'גזרוני — פאנל ניהול', description: '' },
  account:   { title: 'גזרוני — האזור האישי', description: 'המשקים השמורים שלך ופרטי החשבון.' },
};

function ensureMeta() {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  return meta;
}

function updateMeta(route) {
  const next = SCREEN_META[route] || SCREEN_META.home;
  document.title = next.title;
  ensureMeta().setAttribute('content', next.description);
}

function navigateTo(route) {
  const root = document.getElementById('app-main');
  if (!root) return;
  if (typeof currentCleanup === 'function') { currentCleanup(); currentCleanup = null; }
  setRoute(route);
  setRootVariant(route);
  const mount = screenMounters[route] || mountHome;
  const cleanup = mount(root);
  if (typeof cleanup === 'function') currentCleanup = cleanup;
  applyA11yState(readA11yState());
  updateMeta(route);
  window.scrollTo(0, 0);
}

function registerLifecycleGuards() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      try { localStorage.setItem('gezroni.lastHiddenRoute', resolveRoute()); } catch {}
    }
  });
  window.addEventListener('pagehide', (e) => {
    try { if (e.persisted) localStorage.setItem('gezroni.pagehideRoute', resolveRoute()); } catch {}
  });
}

function start() {
  const params = new URLSearchParams(location.search);
  if (params.has('legacy')) {
    const legacy = params.get('legacy');
    if (['market', 'dashboard'].includes(legacy)) {
      location.replace(location.pathname + '#' + legacy);
      return;
    }
  }
  initShell();
  navigateTo(resolveRoute());
  registerLifecycleGuards();
  window.addEventListener('hashchange', () => navigateTo(resolveRoute()));
}

start();
