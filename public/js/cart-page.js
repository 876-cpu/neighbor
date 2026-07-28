function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function render() {
  const itemsEl = document.getElementById('cart-items');
  const totalCard = document.getElementById('cart-total');
  const cart = getCart();
  const productIds = Object.keys(cart);

  if (productIds.length === 0) {
    itemsEl.innerHTML = '<p class="hint">Your cart is empty.</p>';
    totalCard.style.display = 'none';
    return;
  }

  let products;
  try {
    ({ products } = await api('/products'));
  } catch (_) {
    location.href = '/login.html?redirect=/cart.html';
    return;
  }

  let totalCents = 0;
  const rows = [];

  for (const id of productIds) {
    const product = products.find((p) => p.id === id);
    if (!product) continue; // product was removed from the catalog since being added to cart
    const qty = cart[id];
    totalCents += product.priceCents * qty;
    rows.push(`
      <div class="list-row">
        <span>${escapeHtml(product.title)} — $${(product.priceCents / 100).toFixed(2)} each</span>
        <span style="display:flex;align-items:center;gap:0.5rem">
          <input type="number" min="0" value="${qty}" data-qty="${id}" style="width:4rem" />
          <button class="secondary" data-remove="${id}">Remove</button>
        </span>
      </div>`);
  }

  itemsEl.innerHTML = rows.join('') || '<p class="hint">Your cart is empty.</p>';
  totalCard.style.display = rows.length ? 'block' : 'none';
  document.getElementById('total-amount').textContent = `$${(totalCents / 100).toFixed(2)}`;

  itemsEl.querySelectorAll('[data-qty]').forEach((input) => {
    input.addEventListener('change', () => {
      setCartQty(input.dataset.qty, parseInt(input.value, 10) || 0);
      render();
    });
  });
  itemsEl.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setCartQty(btn.dataset.remove, 0);
      render();
    });
  });
}

document.getElementById('checkout-btn').addEventListener('click', async () => {
  try {
    await api('/auth/me');
    location.href = '/checkout.html';
  } catch (_) {
    location.href = '/login.html?redirect=/checkout.html';
  }
});

render();
