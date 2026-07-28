const msg = document.getElementById('msg');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function guardSeller() {
  try {
    const { user } = await api('/auth/me');
    if (user.role !== 'seller') {
      location.href = '/';
    }
  } catch (_) {
    location.href = '/login.html';
  }
}

async function loadWhitelist() {
  const { whitelist } = await api('/whitelist');
  const el = document.getElementById('whitelist');
  el.innerHTML = whitelist.length
    ? whitelist
        .map(
          (e) => `<div class="list-row"><span>${escapeHtml(e)}</span>
            <button class="secondary" data-remove="${escapeHtml(e)}">Remove</button></div>`
        )
        .join('')
    : '<p class="hint">No approved emails yet.</p>';

  el.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/whitelist/${encodeURIComponent(btn.dataset.remove)}`, { method: 'DELETE' });
      loadWhitelist();
    });
  });
}

async function loadProducts() {
  const { products } = await api('/products/manage');
  const el = document.getElementById('products');
  el.innerHTML = products.length
    ? products
        .map(
          (p) => `<div class="list-row">
            <span>${escapeHtml(p.title)} — $${(p.priceCents / 100).toFixed(2)} (stock: ${p.stock})</span>
            <button class="secondary" data-del="${p.id}">Delete</button></div>`
        )
        .join('')
    : '<p class="hint">No products yet.</p>';

  el.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/products/${btn.dataset.del}`, { method: 'DELETE' });
      loadProducts();
    });
  });
}

const STATUS_LABELS = {
  placed: 'Placed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

async function loadOrders() {
  const { orders } = await api('/orders');
  const el = document.getElementById('orders');
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  el.innerHTML = sorted.length
    ? sorted
        .map(
          (o) => `<div class="list-row">
            <span>
              <a href="/order-detail-seller.html?orderId=${o.id}">${escapeHtml(o.buyerEmail)}</a>
              — $${(o.totalCents / 100).toFixed(2)} — ${STATUS_LABELS[o.status] || o.status}
            </span>
          </div>`
        )
        .join('')
    : '<p class="hint">No orders yet.</p>';
}

document.getElementById('wlForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/whitelist', { method: 'POST', body: { email: document.getElementById('wlEmail').value } });
    document.getElementById('wlEmail').value = '';
    loadWhitelist();
  } catch (err) {
    showMessage(msg, err.message);
  }
});

document.getElementById('prodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/products', {
      method: 'POST',
      body: {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priceCents: Math.round(parseFloat(document.getElementById('price').value) * 100),
        stock: parseInt(document.getElementById('stock').value, 10),
      },
    });
    e.target.reset();
    loadProducts();
  } catch (err) {
    showMessage(msg, err.message);
  }
});

document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  await api('/auth/logout', { method: 'POST' });
  location.href = '/';
});

guardSeller();
loadWhitelist();
loadProducts();
loadOrders();
