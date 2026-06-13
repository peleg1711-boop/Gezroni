import { readA11yState, applyA11yState, initKeyboardControls, syncPressedStates, initGlobalEscape, initAccessibilityWidget } from '../lib/a11y.js';
import { watchAuth, getUserProfile } from '../lib/firebase.js?v=20260612-firebase';
import { initPwaInstall } from '../lib/pwa-install.js?v=20260613-landing-v1.1';

export function initShell() {
  if (document.documentElement.getAttribute('data-mode')) return;

  document.documentElement.setAttribute('data-mode', 'behave-fullscreen');
  document.documentElement.setAttribute('data-theme', 'auto');
  document.documentElement.setAttribute('data-anim', 'full');
  document.documentElement.setAttribute('data-shell', '1');

  document.body.innerHTML = `
    <a class="skip-link" href="#app-main">דלג לתוכן הראשי</a>
    <aside class="lp-topnav" id="lp-topnav">
      <a class="lp-topnav-brand" href="#home">גזרוני</a>
      <nav class="app-route-switcher" aria-label="מעבר בין ממשקים">
        <a class="app-route-link" data-route-link="home" href="#home">בית</a>
        <a class="app-route-link" data-route-link="market" href="#market">לוח משקים</a>
        <a class="app-route-link" data-route-link="dashboard" href="#dashboard">חקלאי</a>
        <a class="app-route-link app-nav-account" data-route-link="account" href="#account" aria-label="האזור האישי">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"></path>
          </svg>
          <img class="app-nav-avatar" alt="" hidden>
        </a>
      </nav>
    </aside>
    <main class="app-main" id="app-main"></main>
    <div class="top-sentinel"></div>
    <div class="bot-sentinel"></div>
    <div class="accessibility-widget" id="accessibility-widget" aria-label="הגדרות נגישות">
        <button class="accessibility-toggle" id="accessibility-toggle" type="button" aria-expanded="false" aria-controls="accessibility-panel" aria-haspopup="dialog">
          <span aria-hidden="true">נגישות</span>
        </button>
        <div class="accessibility-panel" id="accessibility-panel" role="dialog" aria-modal="false" aria-labelledby="accessibility-title" hidden>
          <div class="accessibility-title" id="accessibility-title">נגישות</div>
          <div class="accessibility-note">שנו הגדרות נגישות מהירות.</div>
          <div class="accessibility-actions">
            <button class="accessibility-action" data-a11y-toggle="largeText" type="button">טקסט גדול</button>
            <button class="accessibility-action" data-a11y-toggle="contrast" type="button">ניגודיות גבוהה</button>
            <button class="accessibility-action" data-a11y-toggle="reduceMotion" type="button">הפחתת תנועות</button>
            <button class="accessibility-action" data-a11y-toggle="underlineLinks" type="button">קישורים עם קו תחתון</button>
            <button class="accessibility-action" data-a11y-reset type="button">איפוס</button>
          </div>
        </div>
      </div>
    <div id="toast" class="toast" aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <g id="toast-icon"></g>
      </svg>
      <span id="toast-msg"></span>
    </div>
  `;

  const brand = document.getElementById('lp-topnav-brand');
  if (brand) {
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      location.hash = '#home';
    });
  }

  initAccessibilityWidget(readA11yState());
  initKeyboardControls();
  initGlobalEscape(null);
  syncPressedStates();
  applyA11yState(readA11yState());
  _initNavPillHover();
  _initFarmerNavVisibility();
  initPwaInstall();
}

export function setRoute(route) {
  document.documentElement.setAttribute('data-route', route);
  document.querySelectorAll('[data-route-link]').forEach(link => {
    const isActive = link.getAttribute('data-route-link') === route;
    link.classList.toggle('active', isActive);
    if (isActive && !link.hidden) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  _slideNavPill();
  applyA11yState();
}

function _slideNavPill() {
  const switcher = document.querySelector('.app-route-switcher');
  if (!switcher) return;
  const activeLink = switcher.querySelector('.app-route-link.active:not([hidden])');

  let pill = switcher.querySelector('.nav-slider-pill');
  const isFirst = !pill;

  if (isFirst) {
    pill = document.createElement('span');
    pill.className = 'nav-slider-pill';
    pill.setAttribute('aria-hidden', 'true');
    switcher.prepend(pill);
    // No transition on first paint — snap into position.
    // Force reflow between setting transition:none and the position so the
    // browser doesn't animate from the CSS default left:0 to the target.
    pill.style.transition = 'none';
    pill.offsetWidth; // eslint-disable-line no-unused-expressions
  }

  if (!activeLink) {
    pill.hidden = true;
    return;
  }

  pill.hidden = false;
  pill.style.width = activeLink.offsetWidth + 'px';
  pill.style.left = activeLink.offsetLeft + 'px';

  if (isFirst) {
    // Double rAF: let browser paint the initial position, then unlock transitions
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pill.style.transition = '';
    }));
  }
}

function _initNavPillHover() {
  const switcher = document.querySelector('.app-route-switcher');
  if (!switcher) return;

  // On hover: slide the pill to whichever link is hovered (including active)
  switcher.querySelectorAll('.app-route-link').forEach(link => {
    link.addEventListener('mouseenter', () => {
      if (link.hidden) return;
      const pill = switcher.querySelector('.nav-slider-pill');
      if (!pill) return;
      pill.hidden = false;
      pill.style.left  = link.offsetLeft + 'px';
      pill.style.width = link.offsetWidth + 'px';
    });
  });

  // On mouse leave: slide pill back to the active link
  switcher.addEventListener('mouseleave', () => {
    const pill = switcher.querySelector('.nav-slider-pill');
    const activeLink = switcher.querySelector('.app-route-link.active:not([hidden])');
    if (!pill || !activeLink) return;
    pill.style.left  = activeLink.offsetLeft + 'px';
    pill.style.width = activeLink.offsetWidth + 'px';
  });
}

function _setFarmerNavVisible(isVisible) {
  document.querySelectorAll('[data-route-link="dashboard"]').forEach(link => {
    link.hidden = !isVisible;
    link.toggleAttribute('aria-hidden', !isVisible);
    link.tabIndex = isVisible ? 0 : -1;
    if (!isVisible) link.removeAttribute('aria-current');
  });
  _slideNavPill();
}

function _setAccountAvatar(user) {
  const link = document.querySelector('.app-nav-account');
  if (!link) return;
  const icon = link.querySelector('svg');
  const avatar = link.querySelector('.app-nav-avatar');
  const hasPhoto = Boolean(user?.photoURL);
  if (avatar) {
    if (hasPhoto) {
      avatar.src = user.photoURL;
      avatar.onerror = () => {
        avatar.hidden = true;
        avatar.removeAttribute('src');
        if (icon) icon.style.display = '';
      };
    } else {
      avatar.removeAttribute('src');
    }
    avatar.hidden = !hasPhoto;
  }
  if (icon) icon.style.display = hasPhoto ? 'none' : '';
  link.setAttribute('aria-label', user ? 'האזור האישי' : 'כניסה לחשבון');
}

function _initFarmerNavVisibility() {
  _setFarmerNavVisible(false);

  watchAuth(async user => {
    _setAccountAvatar(user);
    if (!user) { _setFarmerNavVisible(false); return; }
    try {
      const profile = await getUserProfile(user.uid);
      const role = profile?.role;
      _setFarmerNavVisible(role === 'farmer' || role === 'admin');
    } catch {
      _setFarmerNavVisible(false);
    }
  });
}

export function setRootVariant(name) {
  document.documentElement.setAttribute('data-root', name || 'lp');
}
