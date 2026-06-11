import { getProduceAlt, getProduceImageSrc } from '../data/produce-art.js?v=20260611-audit-fixes';

export function createTextEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

export function createFarmCard(farm, options) {
  // options reserved for future use
  const card = document.createElement('article');
  card.className = 'product-card farm-card';
  card.dataset.farmId = farm.id;

  const produce = Array.isArray(farm.produce) ? farm.produce : [];

  const visual = document.createElement('div');
  visual.className = 'product-visual';
  if (farm.availability) {
    visual.appendChild(createTextEl('span', 'product-badge', farm.availability));
  }
  const thumb = document.createElement('div');
  thumb.className = `farm-thumb farm-thumb-${farm.id}`;
  const leadProduce = produce[0];
  const heroUrl = farm.hero_image_url || farm.heroImageUrl || '';
  const thumbImage = document.createElement('img');
  thumbImage.className = 'farm-thumb-image';
  if (heroUrl) thumbImage.classList.add('farm-thumb-photo');
  thumbImage.src = heroUrl || (leadProduce && leadProduce.image_url) || getProduceImageSrc(leadProduce);
  thumbImage.onerror = () => { thumbImage.src = getProduceImageSrc(leadProduce); thumbImage.classList.remove('farm-thumb-photo'); thumbImage.onerror = null; };
  thumbImage.alt = leadProduce ? getProduceAlt(leadProduce) : 'תוצרת המשק';
  thumb.appendChild(thumbImage);
  visual.appendChild(thumb);
  card.appendChild(visual);

  const main = document.createElement('div');
  main.className = 'farm-card-main';

  const header = document.createElement('div');
  header.className = 'farm-card-header';
  const profile = document.createElement('div');
  profile.className = 'farm-profile';
  const titleWrap = document.createElement('div');
  titleWrap.appendChild(createTextEl('div', 'farm-name', farm.name));
  titleWrap.appendChild(createTextEl('div', 'farm-owner', (farm.farmer_name || farm.farmerName || '') + ' · ' + farm.region));
  profile.appendChild(titleWrap);
  header.appendChild(profile);

  const km = Number(farm.distance_km);
  if (Number.isFinite(km) && km > 0) {
    const distance = document.createElement('div');
    distance.className = 'farm-distance';
    distance.textContent = '~' + km + ' ק״מ';
    header.appendChild(distance);
  } else if (farm.region) {
    const distance = document.createElement('div');
    distance.className = 'farm-distance';
    distance.textContent = farm.region;
    header.appendChild(distance);
  }
  main.appendChild(header);

  if (produce.length) {
    const produceList = document.createElement('div');
    produceList.className = 'farm-produce-list';
    produce.slice(0, 3).forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'produce-chip';
      const chipImage = document.createElement('img');
      chipImage.className = 'produce-chip-image';
      chipImage.src = item.image_url || getProduceImageSrc(item);
      chipImage.onerror = () => { chipImage.src = getProduceImageSrc(item); chipImage.onerror = null; };
      chipImage.alt = '';
      chipImage.setAttribute('aria-hidden', 'true');
      chip.appendChild(chipImage);
      chip.appendChild(document.createTextNode(item.name || 'תוצרת'));
      produceList.appendChild(chip);
    });
    main.appendChild(produceList);

    const priceLine = document.createElement('div');
    priceLine.className = 'farm-price-strip';
    produce.slice(0, 2).forEach(item => {
      const price = Number(item.price);
      const row = document.createElement('div');
      row.className = 'farm-mini-price';
      row.appendChild(createTextEl('span', '', item.name || 'תוצרת'));
      row.appendChild(createTextEl('strong', '', Number.isFinite(price)
        ? `₪${price % 1 ? price.toFixed(1) : price.toFixed(0)} / ${item.unit || 'יח׳'}`
        : String(item.price || '')
      ));
      priceLine.appendChild(row);
    });
    main.appendChild(priceLine);
  }

  const meta = document.createElement('div');
  meta.className = 'farm-card-meta-line';
  meta.textContent = [farm.city, farm.availability].filter(Boolean).join(' · ');
  if (meta.textContent) main.appendChild(meta);

  card.appendChild(main);

  const actions = document.createElement('div');
  actions.className = 'farm-actions';
  const details = createTextEl('button', 'farm-action-btn primary', 'פרטים ומחירים');
  details.type = 'button';
  actions.appendChild(details);
  card.appendChild(actions);

  return card;
}
