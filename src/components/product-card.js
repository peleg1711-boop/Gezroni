import { createTextEl } from './farm-card.js';

export function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  if (!product.active) card.style.opacity = '0.6';

  card.appendChild(createTextEl('div', 'product-emoji', product.emoji || '🌾'));
  card.appendChild(createTextEl('div', 'product-name', product.name));
  card.appendChild(createTextEl('div', 'product-meta', product.qty || 'זמינות תתעדכן'));
  const price = document.createElement('div');
  price.className = 'product-price';
  price.textContent = '₪' + product.price;
  if (product.unit) price.textContent += ' ' + product.unit;
  card.appendChild(price);
  card.dataset.productId = product.id;
  return card;
}
