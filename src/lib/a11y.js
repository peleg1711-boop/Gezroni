import { ACCESSIBILITY_KEY } from './storage.js';

const defaultState = { largeText: false, contrast: false, reduceMotion: false, underlineLinks: false };

export const readA11yState = () => {
    try {
        return { ...defaultState, ...JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY) || '{}') };
    } catch {
        return { ...defaultState };
    }
};

export const saveA11yState = (state) => {
    try { localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(state)); } catch {}
};

export const applyA11yState = (state) => {
    if (!state) return;
    document.body.classList.toggle('a11y-large-text', !!state.largeText);
    document.body.classList.toggle('a11y-contrast', !!state.contrast);
    document.body.classList.toggle('a11y-reduced-motion', !!state.reduceMotion);
    document.body.classList.toggle('a11y-underline', !!state.underlineLinks);

    document.querySelectorAll('[data-a11y-toggle]').forEach((button) => {
        const key = button.getAttribute('data-a11y-toggle');
        const active = !!state[key];
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
};

export const initAccessibilityWidget = (state) => {
    const toggle = document.getElementById('accessibility-toggle');
    const panel = document.getElementById('accessibility-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
        const open = panel.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    panel.querySelectorAll('[data-a11y-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const key = button.getAttribute('data-a11y-toggle');
            state[key] = !state[key];
            saveA11yState(state);
            applyA11yState(state);
        });
    });

    const reset = panel.querySelector('[data-a11y-reset]');
    if (reset) {
        reset.addEventListener('click', () => {
            Object.assign(state, { ...defaultState });
            saveA11yState(state);
            applyA11yState(state);
        });
    }

    applyA11yState(state);
};

export const initKeyboardControls = () => {
    document.querySelectorAll('.region-pill, .category-card, .produce-catalog-card, .farmer-produce-option, .catalog-tab, .farmer-picker-tab').forEach((el) => {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
        el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                el.click();
            }
        });
    });
};

export const syncPressedStates = () => {
    document.querySelectorAll('.region-pill, .category-card, .produce-catalog-card, .farmer-produce-option, .catalog-tab, .farmer-picker-tab, .board-filter-chip').forEach((el) => {
        if (el.matches('button,[role="button"]')) {
            el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
        }
    });
};

export const initGlobalEscape = (onCloseModalCb) => {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (typeof onCloseModalCb === 'function') onCloseModalCb(null);

        const panel = document.getElementById('accessibility-panel');
        const toggle = document.getElementById('accessibility-toggle');
        if (panel && panel.classList.contains('open')) {
            panel.classList.remove('open');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
    });
};
