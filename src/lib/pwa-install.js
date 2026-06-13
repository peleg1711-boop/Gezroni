// PWA install prompt — subtle, dismissible, never nags.
// Listens for `beforeinstallprompt`, surfaces a themed banner, and respects
// both dismissal (stored) and successful install.

const DISMISS_KEY = 'gezroni-pwa-install-dismissed';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function recentlyDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(ts) && ts > 0 && (Date.now() - ts) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function initPwaInstall() {
  if (isStandalone() || recentlyDismissed()) return;

  let deferredPrompt = null;
  let banner = null;

  const removeBanner = () => {
    if (!banner) return;
    banner.classList.remove('visible');
    const node = banner;
    banner = null;
    setTimeout(() => node.remove(), 260);
  };

  const showBanner = () => {
    if (banner || !deferredPrompt) return;
    banner = document.createElement('div');
    banner.className = 'pwa-install';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'התקנת אפליקציית גזרוני');
    banner.innerHTML = `
      <div class="pwa-install-text">
        <strong>התקינו את גזרוני</strong>
        <span>גישה מהירה ללוח המשקים, ישר מהמסך הראשי</span>
      </div>
      <div class="pwa-install-actions">
        <button type="button" class="pwa-install-accept">התקנה</button>
        <button type="button" class="pwa-install-dismiss" aria-label="סגירה">לא עכשיו</button>
      </div>
    `;
    document.body.appendChild(banner);
    // Trigger entrance on next frame so the transition runs.
    requestAnimationFrame(() => banner.classList.add('visible'));

    banner.querySelector('.pwa-install-accept').addEventListener('click', async () => {
      if (!deferredPrompt) return removeBanner();
      removeBanner();
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch { /* ignore */ }
      deferredPrompt = null;
    });

    banner.querySelector('.pwa-install-dismiss').addEventListener('click', () => {
      rememberDismissed();
      removeBanner();
    });
  };

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Hold off until the user has had a moment on the page.
    setTimeout(showBanner, 2500);
  });

  window.addEventListener('appinstalled', () => {
    rememberDismissed();
    deferredPrompt = null;
    removeBanner();
  });
}
