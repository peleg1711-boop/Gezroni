// Magic-UI-inspired motion helpers, ported to vanilla JS (no framework).
// Effects: staggered blur-fade entrances, in-view number tickers.

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Staggered blur-fade entrance (Magic UI "Blur Fade").
 * Adds .bf-item with a per-element delay; animation plays when .bf-in lands.
 * @param {Iterable<Element>} els
 * @param {number} baseDelay ms before the first item
 * @param {number} step ms between items
 * @param {boolean} playNow add .bf-in immediately (otherwise CSS decides, e.g. parent .visible)
 */
export function applyBlurFade(els, { baseDelay = 0, step = 60, playNow = true } = {}) {
  let i = 0;
  for (const el of els) {
    el.classList.add('bf-item');
    el.style.setProperty('--bf-delay', (baseDelay + i * step) + 'ms');
    if (playNow) el.classList.add('bf-in');
    i++;
  }
}

/**
 * In-view number ticker (Magic UI "Number Ticker").
 * Finds [data-ticker] under root, wraps each digit run in a span, and counts
 * it up from 0 with ease-out when the element scrolls into view.
 * Returns a cleanup function.
 */
export function initNumberTickers(root) {
  const targets = root.querySelectorAll('[data-ticker]');
  if (!targets.length) return () => {};
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return () => {};

  const rafIds = new Set();

  const prepare = el => {
    const runs = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(node => {
      if (!/\d/.test(node.nodeValue)) return;
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\d+)/).forEach(part => {
        if (/^\d+$/.test(part)) {
          const span = document.createElement('span');
          span.className = 'ticker-num';
          span.textContent = part;
          frag.appendChild(span);
          runs.push({ span, target: parseInt(part, 10) });
        } else if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
    return runs;
  };

  const animate = runs => {
    const duration = 1100;
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      runs.forEach(({ span, target }) => {
        span.textContent = String(Math.round(target * eased));
      });
      if (t < 1) {
        const id = requestAnimationFrame(tick);
        rafIds.add(id);
      }
    };
    const id = requestAnimationFrame(tick);
    rafIds.add(id);
  };

  const prepared = new Map();
  targets.forEach(el => {
    const runs = prepare(el);
    if (runs.length) {
      runs.forEach(({ span }) => { span.textContent = '0'; });
      prepared.set(el, runs);
    }
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const runs = prepared.get(entry.target);
      if (runs) animate(runs);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  prepared.forEach((_runs, el) => observer.observe(el));

  return () => {
    observer.disconnect();
    rafIds.forEach(id => cancelAnimationFrame(id));
  };
}

/**
 * Word-by-word blur reveal (Magic UI "Text Animate" blurInUp).
 * Splits .word-reveal headings into word spans; CSS plays them with a
 * stagger when the surrounding .reveal section becomes visible.
 */
export function initWordReveal(root) {
  root.querySelectorAll('.word-reveal').forEach(el => {
    if (el.dataset.wordReveal) return;
    el.dataset.wordReveal = '1';
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'wr-word';
      span.style.setProperty('--wr-delay', (i * 70) + 'ms');
      span.textContent = w;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });
}
