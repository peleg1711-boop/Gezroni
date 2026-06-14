const FARM_PHOTO_BASE = '/src/assets/farm-photos';

const FARM_PHOTO_FILES = [
  'meshek-melamed.webp',
  'bustan-harutzim.webp',
  'organic-hefer.webp',
  'ginat-erez.webp',
  'levi-herbs.webp',
  'otef-tomatoes.webp',
  'arava-fresh.webp',
  'north-orchard.webp',
];

const FARM_PHOTO_BY_ID = {
  'meshek-melamed': 'meshek-melamed.webp',
  'bustan-harutzim': 'bustan-harutzim.webp',
  'organic-hefer': 'organic-hefer.webp',
  'ginat-erez': 'ginat-erez.webp',
  'levi-herbs': 'levi-herbs.webp',
  'otef-tomatoes': 'otef-tomatoes.webp',
  'arava-fresh': 'arava-fresh.webp',
  'north-orchard': 'north-orchard.webp',
};

function hashString(value) {
  let hash = 0;
  const text = String(value || 'gezroni-farm');
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getFarmPhotoSrc(farm) {
  const direct = farm?.hero_image_url || farm?.heroImageUrl;
  if (direct) return direct;

  const id = String(farm?.id || '');
  const mapped = FARM_PHOTO_BY_ID[id];
  if (mapped) return `${FARM_PHOTO_BASE}/${mapped}`;

  const key = [id, farm?.name, farm?.region, farm?.city].filter(Boolean).join('|');
  const file = FARM_PHOTO_FILES[hashString(key) % FARM_PHOTO_FILES.length];
  return `${FARM_PHOTO_BASE}/${file}`;
}
