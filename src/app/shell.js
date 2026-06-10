import { readA11yState, applyA11yState, initKeyboardControls, syncPressedStates, initGlobalEscape, initAccessibilityWidget } from '../lib/a11y.js';

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
}

export function setRoute(route) {
  document.documentElement.setAttribute('data-route', route);
  document.querySelectorAll('[data-route-link]').forEach(link => {
    const isActive = link.getAttribute('data-route-link') === route;
    link.classList.toggle('active', isActive);
    if (isActive) {
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
  const activeLink = switcher.querySelector('.app-route-link.active');
  if (!activeLink) return;

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
      const pill = switcher.querySelector('.nav-slider-pill');
      if (!pill) return;
      pill.style.left  = link.offsetLeft + 'px';
      pill.style.width = link.offsetWidth + 'px';
    });
  });

  // On mouse leave: slide pill back to the active link
  switcher.addEventListener('mouseleave', () => {
    const pill = switcher.querySelector('.nav-slider-pill');
    const activeLink = switcher.querySelector('.app-route-link.active');
    if (!pill || !activeLink) return;
    pill.style.left  = activeLink.offsetLeft + 'px';
    pill.style.width = activeLink.offsetWidth + 'px';
  });
}

export function setRootVariant(name) {
  document.documentElement.setAttribute('data-root', name || 'lp');
}
