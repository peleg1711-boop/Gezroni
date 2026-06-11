import {
  PRODUCE_ASSET_BASE,
  PRODUCE_ASSET_EXTENSION,
  PRODUCE_ASSET_VERSION,
  PRODUCE_CATALOG,
  PRODUCE_CATEGORY_LABELS,
} from './produce-catalog.js?v=20260611-map-hero';

const DEFAULT_PRODUCE_ID = 'herbs';

const HEBREW_QUOTE_RE = /[״"']/g;

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(HEBREW_QUOTE_RE, '')
    .replace(/[_\s]+/g, '-');
}

const PRODUCE_BY_ID = new Map();
const PRODUCE_ALIAS_TO_ID = new Map();

PRODUCE_CATALOG.forEach(item => {
  PRODUCE_BY_ID.set(item.id, item);
  PRODUCE_ALIAS_TO_ID.set(normalizeKey(item.id), item.id);
  PRODUCE_ALIAS_TO_ID.set(normalizeKey(item.name), item.id);
  PRODUCE_ALIAS_TO_ID.set(normalizeKey(item.asset), item.id);
  (item.aliases || []).forEach(alias => {
    PRODUCE_ALIAS_TO_ID.set(normalizeKey(alias), item.id);
  });
});

function findByName(name) {
  const normalized = normalizeKey(name);
  if (!normalized) return null;

  const direct = PRODUCE_ALIAS_TO_ID.get(normalized);
  if (direct) return PRODUCE_BY_ID.get(direct) || null;

  return PRODUCE_CATALOG.find(item => {
    const candidates = [item.name, item.id, item.asset, ...(item.aliases || [])]
      .map(normalizeKey)
      .filter(Boolean);
    return candidates.some(candidate => normalized.includes(candidate) || candidate.includes(normalized));
  }) || null;
}

export { PRODUCE_ASSET_BASE, PRODUCE_ASSET_EXTENSION, PRODUCE_ASSET_VERSION, PRODUCE_CATALOG, PRODUCE_CATEGORY_LABELS };

export function getProduceCatalog() {
  return PRODUCE_CATALOG.map(item => ({ ...item }));
}

export function getProduceCategoryLabel(category) {
  return PRODUCE_CATEGORY_LABELS[category] || category || 'תוצרת';
}

export function getProduceById(itemOrId) {
  const rawId = typeof itemOrId === 'string' ? itemOrId : itemOrId?.catalogId || itemOrId?.id || itemOrId?.asset;
  const normalizedId = normalizeKey(rawId);
  const resolvedId = PRODUCE_ALIAS_TO_ID.get(normalizedId);
  if (resolvedId && PRODUCE_BY_ID.has(resolvedId)) return PRODUCE_BY_ID.get(resolvedId);
  if (PRODUCE_BY_ID.has(rawId)) return PRODUCE_BY_ID.get(rawId);

  if (typeof itemOrId === 'object') {
    const byName = findByName(itemOrId?.name);
    if (byName) return byName;
  }

  return PRODUCE_BY_ID.get(DEFAULT_PRODUCE_ID);
}

export function getProduceKey(itemOrId) {
  const item = getProduceById(itemOrId);
  return item?.asset || DEFAULT_PRODUCE_ID;
}

export function getProduceImageSrc(itemOrId) {
  const key = getProduceKey(itemOrId);
  return `${PRODUCE_ASSET_BASE}/${key}.${PRODUCE_ASSET_EXTENSION}?v=${PRODUCE_ASSET_VERSION}`;
}

export function getProduceAlt(itemOrId) {
  const item = getProduceById(itemOrId);
  return item?.name || (typeof itemOrId === 'object' ? itemOrId?.name : '') || 'תוצרת';
}
