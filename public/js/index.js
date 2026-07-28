function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadProducts() {
  const el = document.getElementById('products');
  try {
    const { products } = await api('/products');
    if (products.length === 0) {
      el.textContent = 'No products yet.';
      return;
    }
    el.innerHTML = products
      .map(
        (p) => `
      <div class="product">
        <div>
          <strong>${escapeHtml(p.title)}</strong><br/>
          <small class="hint">${escapeHtml(p.description || '')}</small>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem">
          <span class="price">$${(p.priceCents / 100).toFixed(2)}</span>
          <button data-add="${p.id}">Add to cart</button>
        </div>
      </div>`
      )
      .join('');

    el.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        addToCart(btn.dataset.add, 1);
        btn.textContent = 'Added';
        setTimeout(() => (btn.textContent = 'Add to cart'), 1000);
      });
    });
  } catch (err) {
    el.textContent = 'Could not load products.';
  }
}

async function updateNav() {
  try {
    const { user } = await api('/auth/me');
    const nav = document.getElementById('nav');
    const cartLink = '<a href="/cart.html" id="cart-badge">Cart</a>';
    nav.innerHTML =
      user.role === 'seller'
        ? `${cartLink} <a href="/seller.html">Seller dashboard</a> <a href="#" id="logout">Log out</a>`
        : `${cartLink} <span class="hint">Hi, ${escapeHtml(user.name)}</span> <a href="#" id="logout">Log out</a>`;
    document.getElementById('logout').addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/auth/logout', { method: 'POST' });
      location.href = '/login.html';
    });
    updateCartBadge();
    loadProducts();
  } catch (_) {
    // Not logged in — products require an account now, so send them to log in.
    location.href = '/login.html?redirect=/';
  }
}

updateNav();
