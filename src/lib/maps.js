import { getProduceAlt, getProduceImageSrc } from '../data/produce-art.js?v=20260606-generated-produce-v1';

const API_KEY = 'AIzaSyAOFEXS7JaIPnKPOLL-5H0TxXIT2AegEeM';

const DEFAULT_CENTER = { lat: 31.95, lng: 35.08 };
const OVERVIEW_ZOOM = 5;
const FOCUS_ZOOM = 12;
const HOME_PREVIEW_ZOOM = 8;
const ISRAEL_MAP_BOUNDS = {
  north: 35.55,
  south: 28.05,
  west: 31.8,
  east: 37.8,
};

let mapInstance = null;
let markers = [];
let markerByFarmId = new Map();
let activeInfoWindow = null;
let loadPromise = null;
let animationTimers = [];
let mapListeners = [];
let visibleFarmIds = new Set();
let homeMapPreview = null;

function loadScript() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const cb = '__gezroniMapReady';
    window[cb] = () => {
      delete window[cb];
      resolve();
    };

    const existing = document.querySelector('script[data-gezroni-google-maps]');
    if (existing) {
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('Maps failed to load'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.gezroniGoogleMaps = '1';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=${cb}&loading=async`;
    script.async = true;
    script.onerror = () => {
      script.remove();
      loadPromise = null;
      reject(new Error('Maps failed to load'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

function createTextEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getFarmPosition(farm) {
  const lat = toNumber(farm?.lat ?? farm?.coordinates?.lat);
  const lng = toNumber(farm?.lng ?? farm?.coordinates?.lng);
  return lat !== null && lng !== null ? { lat, lng } : null;
}

function getFarmId(farm) {
  return String(farm?.id ?? '');
}

function normalizeContact(contact) {
  if (!contact) return {};
  if (typeof contact === 'string') {
    try {
      return JSON.parse(contact) || {};
    } catch {
      return {};
    }
  }
  return contact;
}

function formatLocation(farm) {
  return [farm?.region, farm?.city].filter(Boolean).join(' · ') || 'ישראל';
}

function formatPrice(item) {
  const price = toNumber(item?.price);
  const priceText = price === null ? String(item?.price ?? '') : `₪${price % 1 ? price.toFixed(1) : price.toFixed(0)}`;
  return `${priceText} / ${item?.unit || 'יח׳'}`;
}

function getNavigationUrl(farm) {
  const contact = normalizeContact(farm?.contact);
  if (contact.navigation) return contact.navigation;

  const position = getFarmPosition(farm);
  if (position) return `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${farm?.name || ''} ${formatLocation(farm)}`)}`;
}

function getMarkerIcon(isActive) {
  if (!window.google?.maps) return null;

  const stroke = isActive ? '#C4834A' : '#2D5A1B';
  const fill = isActive ? '#F59E0B' : '#A5D96A';
  const size = isActive ? 48 : 38;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="white"></path><circle cx="12" cy="10" r="3.4" fill="${fill}"></circle></svg>`
    ),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size),
  };
}

function getHomeFarmMarkerIcon(isActive) {
  if (!window.google?.maps) return null;

  const size = isActive ? 50 : 40;
  const fill = isActive ? '#2D5A1B' : '#FFFFFF';
  const stroke = isActive ? '#C4834A' : '#2D5A1B';
  const roof = isActive ? '#A5D96A' : '#2D5A1B';
  const ring = isActive ? '<circle cx="24" cy="24" r="22" fill="none" stroke="#C4834A" stroke-width="2.6" opacity=".72"/>' : '';

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
        <filter id="shadow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#10220A" flood-opacity=".22"/>
        </filter>
        ${ring}
        <g filter="url(#shadow)">
          <rect x="7" y="7" width="34" height="34" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <path d="M14 24 24 15l10 9" fill="none" stroke="${roof}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 24v11h14V24" fill="${isActive ? '#FFFFFF' : '#F4F8ED'}" stroke="${roof}" stroke-width="2.3" stroke-linejoin="round"/>
          <path d="M21 35v-7h6v7" fill="${isActive ? '#A5D96A' : '#DDEFCB'}" stroke="${roof}" stroke-width="2.1" stroke-linejoin="round"/>
        </g>
      </svg>`
    ),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

function getBestFarmDeal(farm) {
  const produce = Array.isArray(farm?.produce) ? farm.produce : [];
  return produce.reduce((best, item) => {
    const currentPrice = toNumber(item?.price);
    const bestPrice = toNumber(best?.price);
    if (currentPrice === null) return best;
    if (!best || bestPrice === null || currentPrice < bestPrice) return item;
    return best;
  }, null);
}

function createHomeMapDealContent(farm, deal = getBestFarmDeal(farm)) {
  const wrap = document.createElement('div');
  wrap.className = 'home-map-info-card';

  const image = document.createElement('img');
  image.className = 'home-map-info-image';
  image.src = getProduceImageSrc(deal);
  image.alt = deal ? getProduceAlt(deal) : 'תוצרת המשק';
  wrap.appendChild(image);

  const body = document.createElement('div');
  body.className = 'home-map-info-body';
  body.appendChild(createTextEl('span', 'home-map-info-farm', farm?.name || 'משק'));
  body.appendChild(createTextEl('strong', 'home-map-info-title', deal?.name || 'תוצרת זמינה'));
  body.appendChild(createTextEl('span', 'home-map-info-price', deal ? formatPrice(deal) : 'מחיר מתעדכן'));
  wrap.appendChild(body);

  return wrap;
}

function createFarmInfoContent(farm) {
  const wrap = document.createElement('div');
  wrap.className = 'map-farm-info';

  wrap.appendChild(createTextEl('div', 'map-farm-title', farm?.name || 'משק'));

  const sub = [
    farm?.farmer_name || farm?.farmerName,
    formatLocation(farm),
    farm?.last_updated || farm?.lastUpdated ? `עודכן ${farm.last_updated || farm.lastUpdated}` : '',
  ].filter(Boolean).join(' · ');
  wrap.appendChild(createTextEl('div', 'map-farm-sub', sub));

  const story = [farm?.availability, farm?.pickup, farm?.story].filter(Boolean).join(' · ');
  if (story) wrap.appendChild(createTextEl('div', 'map-farm-story', story));

  const produce = Array.isArray(farm?.produce) ? farm.produce : [];
  if (produce.length) {
    wrap.appendChild(createTextEl('div', 'map-farm-label', 'תוצרת ומחירים'));
    const prices = document.createElement('div');
    prices.className = 'map-farm-prices';

    produce.slice(0, 3).forEach(item => {
      const row = document.createElement('div');
      row.className = 'map-farm-price';
      const product = document.createElement('span');
      product.className = 'map-farm-produce-name';
      const image = document.createElement('img');
      image.className = 'map-farm-produce-image';
      image.src = getProduceImageSrc(item);
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      product.appendChild(image);
      product.appendChild(createTextEl('span', '', item.name || 'תוצרת'));
      row.appendChild(product);
      row.appendChild(createTextEl('strong', '', formatPrice(item)));
      prices.appendChild(row);
    });

    wrap.appendChild(prices);
  }

  const actions = document.createElement('div');
  actions.className = 'map-farm-actions';

  const details = createTextEl('button', 'primary', 'פרטים מלאים');
  details.type = 'button';
  details.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('gezroni:open-farm-details', {
      detail: { farmId: farm?.id },
    }));
  });

  const nav = createTextEl('a', 'secondary', 'נווט למשק');
  nav.href = getNavigationUrl(farm);
  nav.target = '_blank';
  nav.rel = 'noopener';

  actions.appendChild(details);
  actions.appendChild(nav);
  wrap.appendChild(actions);

  return wrap;
}

function clearMapAnimationTimers() {
  animationTimers.forEach(timer => clearTimeout(timer));
  animationTimers = [];
  markers.forEach(({ marker }) => {
    if (marker?.setAnimation) marker.setAnimation(null);
  });
}

function queueMapAnimation(fn, delay) {
  const timer = window.setTimeout(() => {
    animationTimers = animationTimers.filter(item => item !== timer);
    if (!mapInstance) return;
    fn();
  }, delay);
  animationTimers.push(timer);
}

function clearMapListeners() {
  mapListeners.forEach(listener => listener?.remove?.());
  mapListeners = [];
}

function closeActiveInfoWindow() {
  if (activeInfoWindow) activeInfoWindow.close();
  activeInfoWindow = null;
}

function setFocusedMarkerStyle(farmId) {
  const targetId = String(farmId);
  markerByFarmId.forEach((entry, id) => {
    entry.marker.setIcon(getMarkerIcon(id === targetId));
    if (id !== targetId && entry.marker.setAnimation) {
      entry.marker.setAnimation(null);
    }
  });
}

function updateFocusedFarmCard(farmId) {
  const targetId = String(farmId);
  let focusedCard = null;
  document.querySelectorAll('.farm-card').forEach(card => {
    card.classList.toggle('map-focused', card.dataset.farmId === targetId);
    if (card.dataset.farmId === targetId) focusedCard = card;
  });

  if (focusedCard) {
    const list = focusedCard.closest('.products-grid');
    if (list && list.scrollHeight > list.clientHeight + 2) {
      const listRect = list.getBoundingClientRect();
      const cardRect = focusedCard.getBoundingClientRect();
      const above = cardRect.top < listRect.top;
      const below = cardRect.bottom > listRect.bottom;
      if (above || below) {
        list.scrollBy({
          top: above ? cardRect.top - listRect.top - 12 : cardRect.bottom - listRect.bottom + 12,
          behavior: 'smooth',
        });
      }
    }
  }
}

function openFarmInfoWindow(farmId) {
  const entry = markerByFarmId.get(String(farmId));
  if (!entry || !mapInstance || !window.google?.maps) return;

  closeActiveInfoWindow();
  activeInfoWindow = entry.info;
  activeInfoWindow.open(mapInstance, entry.marker);
}

function clampMapCenter() {
  if (!mapInstance || !window.google?.maps) return;
  const center = mapInstance.getCenter();
  if (!center) return;

  const lat = Math.min(Math.max(center.lat(), ISRAEL_MAP_BOUNDS.south), ISRAEL_MAP_BOUNDS.north);
  const lng = Math.min(Math.max(center.lng(), ISRAEL_MAP_BOUNDS.west), ISRAEL_MAP_BOUNDS.east);
  if (Math.abs(lat - center.lat()) > 0.00001 || Math.abs(lng - center.lng()) > 0.00001) {
    mapInstance.panTo({ lat, lng });
  }
}

function getVisibleMarkerEntries() {
  return markers.filter(entry => visibleFarmIds.has(String(entry.id)));
}

function fitMapToMarkers(entries = getVisibleMarkerEntries()) {
  if (!mapInstance || !window.google?.maps) return;
  const map = mapInstance;

  if (!entries.length) {
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(OVERVIEW_ZOOM);
    return;
  }

  if (entries.length === 1) {
    map.setCenter(entries[0].marker.getPosition());
    map.setZoom(Math.max(OVERVIEW_ZOOM, 10));
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  entries.forEach(({ marker }) => bounds.extend(marker.getPosition()));
  map.fitBounds(bounds, 58);

  const relaxOverviewZoom = () => {
    if (!mapInstance || mapInstance !== map) return;
    const currentZoom = map.getZoom() || OVERVIEW_ZOOM;
    if (currentZoom < OVERVIEW_ZOOM) map.setZoom(OVERVIEW_ZOOM);
    if (currentZoom > 8) map.setZoom(8);
  };
  mapListeners.push(google.maps.event.addListenerOnce(map, 'idle', relaxOverviewZoom));
  queueMapAnimation(relaxOverviewZoom, 450);
}

function clearMarkers() {
  clearMapAnimationTimers();
  closeActiveInfoWindow();
  markers.forEach(({ marker, info }) => {
    info.close();
    marker.setMap(null);
  });
  markers = [];
  markerByFarmId.clear();
}

function clearHomePreviewTimers() {
  if (!homeMapPreview) return;
  homeMapPreview.timers.forEach(timer => window.clearTimeout(timer));
  homeMapPreview.timers = [];
}

function queueHomePreview(fn, delay) {
  if (!homeMapPreview) return;
  const timer = window.setTimeout(() => {
    if (!homeMapPreview) return;
    fn();
    if (homeMapPreview) {
      homeMapPreview.timers = homeMapPreview.timers.filter(item => item !== timer);
    }
  }, delay);
  homeMapPreview.timers.push(timer);
}

function setHomePreviewMarkerStyle(activeId) {
  if (!homeMapPreview) return;
  const targetId = String(activeId);
  homeMapPreview.entries.forEach(entry => {
    entry.marker.setIcon(getHomeFarmMarkerIcon(String(entry.id) === targetId));
    entry.marker.setZIndex(String(entry.id) === targetId ? 20 : 1);
  });
}

function fitHomePreviewToMarkers() {
  if (!homeMapPreview || !window.google?.maps) return;
  const { map, entries } = homeMapPreview;
  const preview = homeMapPreview;

  if (!entries.length) {
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(OVERVIEW_ZOOM);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  entries.forEach(({ marker }) => bounds.extend(marker.getPosition()));
  map.fitBounds(bounds, { top: 42, right: 42, bottom: 42, left: 42 });

  const relaxZoom = () => {
    if (!homeMapPreview || homeMapPreview !== preview) return;
    const zoom = map.getZoom() || OVERVIEW_ZOOM;
    if (zoom < 6) map.setZoom(6);
    if (zoom > 8) map.setZoom(8);
  };
  google.maps.event.addListenerOnce(map, 'idle', relaxZoom);
  queueHomePreview(relaxZoom, 500);
}

export function destroyHomeMapPreview() {
  if (!homeMapPreview) return;
  clearHomePreviewTimers();
  homeMapPreview.info?.close();
  homeMapPreview.entries.forEach(entry => entry.marker.setMap(null));
  homeMapPreview.listeners.forEach(listener => listener.remove());
  homeMapPreview = null;
}

export async function initHomeMapPreview(container, farms = [], options = {}) {
  await loadScript();
  destroyHomeMapPreview();

  if (!container) return null;
  container.classList.add('is-google-map');
  container.innerHTML = '';

  const map = new google.maps.Map(container, {
    center: DEFAULT_CENTER,
    zoom: OVERVIEW_ZOOM,
    minZoom: 5,
    maxZoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    restriction: {
      latLngBounds: ISRAEL_MAP_BOUNDS,
      strictBounds: true,
    },
    tilt: 0,
    clickableIcons: false,
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: true,
    scaleControl: false,
    gestureHandling: 'cooperative',
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_LEFT,
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE],
    },
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
  });

  const info = new google.maps.InfoWindow({
    maxWidth: window.matchMedia('(max-width: 520px)').matches ? 260 : 312,
    disableAutoPan: false,
  });
  const entries = [];
  const markerById = new Map();

  farms.forEach(farm => {
    const position = getFarmPosition(farm);
    const id = getFarmId(farm);
    if (!position || !id) return;

    const marker = new google.maps.Marker({
      position,
      map,
      title: farm.name || 'משק',
      icon: getHomeFarmMarkerIcon(false),
      optimized: true,
    });
    const entry = { id, farm, marker };
    entries.push(entry);
    markerById.set(id, entry);
  });

  const listeners = [
    map.addListener('dragend', () => {
      const center = map.getCenter();
      if (!center) return;
      const lat = Math.min(Math.max(center.lat(), ISRAEL_MAP_BOUNDS.south), ISRAEL_MAP_BOUNDS.north);
      const lng = Math.min(Math.max(center.lng(), ISRAEL_MAP_BOUNDS.west), ISRAEL_MAP_BOUNDS.east);
      if (Math.abs(lat - center.lat()) > 0.00001 || Math.abs(lng - center.lng()) > 0.00001) {
        map.panTo({ lat, lng });
      }
    }),
  ];

  homeMapPreview = { map, info, entries, markerById, listeners, timers: [] };

  const activateFarm = (farmId) => {
    const entry = markerById.get(String(farmId));
    if (!entry || !homeMapPreview) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('a11y-reduced-motion');
    clearHomePreviewTimers();
    info.close();
    setHomePreviewMarkerStyle(entry.id);

    const deal = typeof options.getDeal === 'function' ? options.getDeal(entry.farm) : getBestFarmDeal(entry.farm);
    info.setContent(createHomeMapDealContent(entry.farm, deal));

    const position = entry.marker.getPosition();
    const currentZoom = map.getZoom() || OVERVIEW_ZOOM;
    const targetZoom = Math.max(currentZoom, HOME_PREVIEW_ZOOM);
    const panDelay = reduceMotion ? 0 : 260;
    const zoomDelay = reduceMotion ? 80 : 1100;
    const openDelay = reduceMotion ? 140 : 1750;

    queueHomePreview(() => map.panTo(position), panDelay);
    queueHomePreview(() => {
      map.panTo(position);
      if ((map.getZoom() || 0) < targetZoom) map.setZoom(targetZoom);
    }, zoomDelay);
    queueHomePreview(() => {
      info.open(map, entry.marker);
      if (typeof options.onActiveFarm === 'function') options.onActiveFarm(entry.farm);
    }, openDelay);
  };

  entries.forEach(entry => {
    const listener = entry.marker.addListener('click', () => activateFarm(entry.id));
    listeners.push(listener);
  });

  fitHomePreviewToMarkers();

  return {
    activateFarm,
    resize() {
      google.maps.event.trigger(map, 'resize');
      fitHomePreviewToMarkers();
    },
    destroy: destroyHomeMapPreview,
  };
}

export async function initMapInstance(container, farms = []) {
  await loadScript();

  clearMarkers();
  clearMapListeners();

  mapInstance = new google.maps.Map(container, {
    center: DEFAULT_CENTER,
    zoom: OVERVIEW_ZOOM,
    minZoom: OVERVIEW_ZOOM,
    maxZoom: 14,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    restriction: {
      latLngBounds: ISRAEL_MAP_BOUNDS,
      strictBounds: true,
    },
    tilt: 0,
    clickableIcons: false,
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: true,
    scaleControl: true,
    gestureHandling: 'greedy',
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_LEFT,
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE],
    },
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
  });

  mapListeners.push(mapInstance.addListener('dragend', clampMapCenter));
  mapListeners.push(mapInstance.addListener('zoom_changed', () => {
    window.setTimeout(clampMapCenter, 80);
  }));
  container.addEventListener('wheel', event => {
    event.preventDefault();
  }, { passive: false });

  farms.forEach(farm => {
    const position = getFarmPosition(farm);
    const id = getFarmId(farm);
    if (!position || !id) return;

    const marker = new google.maps.Marker({
      position,
      map: mapInstance,
      title: farm.name || 'משק',
      icon: getMarkerIcon(false),
    });
    const info = new google.maps.InfoWindow({
      content: createFarmInfoContent(farm),
      maxWidth: window.matchMedia('(max-width: 520px)').matches ? 260 : 310,
    });

    marker.addListener('click', () => focusFarmOnMap(id));

    const entry = { id, farm, marker, info };
    markers.push(entry);
    markerByFarmId.set(id, entry);
  });

  syncMapMarkers(farms);
  return mapInstance;
}

export function syncMapMarkers(farms = []) {
  const ids = new Set(farms.map(getFarmId).filter(Boolean));
  visibleFarmIds = ids;

  if (!mapInstance) return;

  closeActiveInfoWindow();
  clearMapAnimationTimers();

  markerByFarmId.forEach((entry, id) => {
    const isVisible = ids.size === 0 ? false : ids.has(id);
    entry.marker.setMap(isVisible ? mapInstance : null);
    entry.marker.setIcon(getMarkerIcon(false));
  });

  document.querySelectorAll('.farm-card').forEach(card => card.classList.remove('map-focused'));
  fitMapToMarkers(markers.filter(entry => ids.has(String(entry.id))));
}

export function resizeMap() {
  if (!mapInstance || !window.google?.maps) return;
  google.maps.event.trigger(mapInstance, 'resize');
  fitMapToMarkers(getVisibleMarkerEntries());
}

export function focusFarmOnMap(farmId) {
  const id = String(farmId);
  const entry = markerByFarmId.get(id);
  updateFocusedFarmCard(id);

  if (!entry || !mapInstance || !window.google?.maps) return;

  if (!visibleFarmIds.has(id)) {
    visibleFarmIds.add(id);
    entry.marker.setMap(mapInstance);
  }

  clearMapAnimationTimers();
  closeActiveInfoWindow();
  setFocusedMarkerStyle(id);

  const configuredZoom = toNumber(entry.farm?.map_zoom ?? entry.farm?.mapZoom) || FOCUS_ZOOM;
  const targetZoom = Math.min(FOCUS_ZOOM, Math.max(OVERVIEW_ZOOM + 1, configuredZoom));
  const currentZoom = mapInstance.getZoom() || OVERVIEW_ZOOM;
  const position = entry.marker.getPosition();

  queueMapAnimation(() => {
    mapInstance.panTo(position);
    if (currentZoom > targetZoom + 2) {
      mapInstance.setZoom(targetZoom - 2);
    }
  }, 20);

  queueMapAnimation(() => {
    mapInstance.panTo(position);
    mapInstance.setZoom(targetZoom);
  }, 360);

  queueMapAnimation(() => {
    if (entry.marker.setAnimation && google.maps.Animation) {
      entry.marker.setAnimation(google.maps.Animation.BOUNCE);
      queueMapAnimation(() => entry.marker.setAnimation(null), 850);
    }
    openFarmInfoWindow(id);
    clampMapCenter();
  }, 680);
}

export function destroyMap() {
  clearMarkers();
  clearMapListeners();
  visibleFarmIds.clear();
  mapInstance = null;
}

export async function geocodeFarmCity(city, region) {
  if (!city && !region) return null;
  try {
    const query = encodeURIComponent(`${city || region}, ישראל`);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${API_KEY}`
    );
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
  } catch {}
  return null;
}
