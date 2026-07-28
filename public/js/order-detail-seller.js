function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const params = new URLSearchParams(location.search);
const orderId = params.get('orderId');
const detailsEl = document.getElementById('details');
const locationNote = document.getElementById('location-note');

let map = null;
let marker = null;

function ensureMap(lat, lng) {
  if (!map) {
    map = L.map('map').setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    marker = L.marker([lat, lng]).addTo(map);
  } else {
    marker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);
  }
}

function renderDetails(order) {
  detailsEl.innerHTML = `
    <p><strong>Buyer:</strong> ${escapeHtml(order.buyerEmail)}</p>
    <p><strong>Phone:</strong> <a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a></p>
    <p><strong>Status:</strong> ${order.status.replace(/_/g, ' ')}</p>
    <p><strong>Items:</strong></p>
    <ul>${order.items.map((i) => `<li>${i.qty} x ${escapeHtml(i.title)}</li>`).join('')}</ul>
    <p><strong>Total:</strong> $${(order.totalCents / 100).toFixed(2)}</p>
  `;
}

async function load() {
  try {
    const { order } = await api(`/orders/${orderId}`);
    renderDetails(order);
    if (order.location) {
      ensureMap(order.location.lat, order.location.lng);
      locationNote.textContent = `Last updated ${new Date(order.location.updatedAt).toLocaleTimeString()}`;
    } else {
      locationNote.textContent = 'Waiting for the buyer to share their location…';
    }
  } catch (err) {
    detailsEl.textContent = 'Could not load this order.';
  }
}

const socket = io({ withCredentials: true });
socket.on('connect', () => socket.emit('order:join', { orderId }));

socket.on('location:update', ({ lat, lng, updatedAt }) => {
  ensureMap(lat, lng);
  locationNote.textContent = `Last updated ${new Date(updatedAt).toLocaleTimeString()}`;
});

socket.on('location:stopped', () => {
  locationNote.textContent = 'The buyer stopped sharing their location.';
});

document.querySelectorAll('[data-status]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await api(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: btn.dataset.status } });
      load();
    } catch (err) {
      alert(err.message);
    }
  });
});

load();
