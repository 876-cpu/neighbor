function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null), // permission denied or unavailable — order still proceeds
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

(async function guard() {
  try {
    await api('/auth/me');
  } catch (_) {
    location.href = '/login.html?redirect=/checkout.html';
  }
})();

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const cart = getCart();
  const items = Object.entries(cart).map(([productId, qty]) => ({ productId, qty }));
  if (items.length === 0) {
    showMessage(msg, 'Your cart is empty.');
    return;
  }

  const submitBtn = e.target.querySelector('button');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Requesting location…';

  const coords = await getCurrentPosition();

  try {
    submitBtn.textContent = 'Placing order…';
    const { order } = await api('/orders', {
      method: 'POST',
      body: { phone: document.getElementById('phone').value, items },
    });
    clearCart();

    // Stash the initial fix so the tracking page can send it the moment
    // its socket connects, instead of waiting for the first watchPosition tick.
    sessionStorage.setItem(
      'initial_location',
      coords ? JSON.stringify({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }) : ''
    );
    location.href = `/order-tracking.html?orderId=${order.id}`;
  } catch (err) {
    showMessage(msg, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Share location & place order';
  }
});
