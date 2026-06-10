import { syncPressedStates } from './a11y.js';

const defaultState = {
  currentRegion: 'all',
  currentCategory: 'all',
  currentProduce: 'all',
  currentMaxPrice: 'all',
  currentAvailability: 'all',
  currentTag: 'all',
  currentSearchTerm: '',
  currentSort: 'distance',
  currentUserLocation: '',
  selectedFarmFilter: null,
  focusedFarmId: null,
  refresh: null,
  seedMarkers: null,
};

export const state = (() => {
  try {
    const raw = localStorage.getItem('gezroni.boardFilters.v1');
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
})();

function persist() {
  try {
    const { refresh, seedMarkers, ...toSave } = state;
    localStorage.setItem('gezroni.boardFilters.v1', JSON.stringify(toSave));
  } catch {}
}

function syncAndPersist() { syncPressedStates(); persist(); }

export function selectRegion(el, val) {
  document.querySelectorAll('.region-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.currentRegion = val;
  state.selectedFarmFilter = null;
  state.focusedFarmId = null;
  syncAndPersist();
  if (typeof state.seedMarkers === 'function') state.seedMarkers();
  if (typeof state.refresh === 'function') state.refresh();
}

export function selectCategory(el, val) {
  const card = el.closest('.category-card');
  if (!card) return;
  document.querySelectorAll('.category-card').forEach(b => b.classList.remove('active'));
  card.classList.add('active');
  state.currentCategory = val;
  state.selectedFarmFilter = null;
  state.focusedFarmId = null;
  syncAndPersist();
  if (typeof state.seedMarkers === 'function') state.seedMarkers();
  if (typeof state.refresh === 'function') state.refresh();
}

export function setSearchTerm(value) {
  state.currentSearchTerm = value;
  persist();
  if (typeof state.refresh === 'function') state.refresh();
}

export function setSortMode(value) {
  state.currentSort = value || 'distance';
  persist();
  if (typeof state.refresh === 'function') state.refresh();
}

export function clearBoardFilters() {
  Object.assign(state, {
    currentRegion: 'all', currentCategory: 'all', currentProduce: 'all', currentMaxPrice: 'all',
    currentAvailability: 'all', currentTag: 'all', currentSearchTerm: '',
    currentSort: 'distance', selectedFarmFilter: null, focusedFarmId: null,
  });
  const s = document.getElementById('farm-search-input');
  if (s) s.value = '';
  const sort = document.getElementById('farm-sort-select');
  if (sort) sort.value = 'distance';
  document.querySelectorAll('.region-pill').forEach(b => b.classList.remove('active'));
  const defR = document.querySelector('.region-pill[data-val="all"]');
  if (defR) defR.classList.add('active');
  document.querySelectorAll('.category-card').forEach(b => b.classList.remove('active'));
  const defC = document.querySelector('.category-card[data-val="all"]');
  if (defC) defC.classList.add('active');
  document.querySelectorAll('.produce-catalog-card').forEach(b => b.classList.remove('active'));
  const defP = document.querySelector('.produce-catalog-card[data-produce-id="all"]');
  if (defP) defP.classList.add('active');
  syncAndPersist();
  if (typeof state.refresh === 'function') state.refresh();
}
