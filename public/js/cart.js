const CART_KEY = 'one_seller_cart_v1';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + qty;
  saveCart(cart);
  updateCartBadge();
}

function setCartQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[productId];
  else cart[productId] = qty;
  saveCart(cart);
  updateCartBadge();
}

function clearCart() {
  saveCart({});
  updateCartBadge();
}

function cartItemCount() {
  return Object.values(getCart()).reduce((sum, q) => sum + q, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cartItemCount();
  badge.textContent = count > 0 ? `Cart (${count})` : 'Cart';
}
