const KEY = 'gezroni.cart.v1';

export function getCart() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; }
}

function save(cart) {
  try { sessionStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
}

export function addItem(item) {
  // item shape: { id, farmId, farmName, name, price, unit, icon }
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id && i.farmId === item.farmId);
  if (existing) { existing.qty = (existing.qty || 1) + 1; }
  else { cart.push({ ...item, qty: 1 }); }
  save(cart);
  return cart;
}

export function removeItem(id, farmId) {
  const cart = getCart().filter(i => !(i.id === id && i.farmId === farmId));
  save(cart);
  return cart;
}

export function clearCart() {
  try { sessionStorage.removeItem(KEY); } catch {}
}

export function getItemCount() {
  return getCart().reduce((n, i) => n + (i.qty || 1), 0);
}
