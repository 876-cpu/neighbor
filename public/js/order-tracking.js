const params = new URLSearchParams(location.search);
const orderId = params.get('orderId');
const statusEl = document.getElementById('status');
const sharingNote = document.getElementById('sharing-note');
const stopBtn = document.getElementById('stop-btn');

let watchId = null;

function stopSharing() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  socket.emit('location:stop', { orderId });
  sharingNote.textContent = 'Location sharing stopped.';
  stopBtn.disabled = true;
}

async function loadStatus() {
  try {
    const { order } = await api(`/orders/${orderId}`);
    statusEl.textContent = order.status.replace(/_/g, ' ');
    if (order.status === 'delivered' || order.status === 'cancelled') {
      stopSharing();
      sharingNote.textContent = 'This order is finished, so location sharing has stopped.';
    }
  } catch (_) {
    statusEl.textContent = 'unknown';
  }
}

const socket = io({ withCredentials: true });

socket.on('connect', () => {
  socket.emit('order:join', { orderId });

  // Send the checkout-time fix right away, then start continuous updates.
  const initial = sessionStorage.getItem('initial_location');
  if (initial) {
    try {
      const coords = JSON.parse(initial);
      socket.emit('location:update', { orderId, ...coords });
    } catch (_) {}
    sessionStorage.removeItem('initial_location');
  }

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        socket.emit('location:update', {
          orderId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        sharingNote.textContent = 'Location permission was denied — the seller will only see your phone number.';
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  } else {
    sharingNote.textContent = 'This browser does not support location sharing.';
  }
});

socket.on('order:status', ({ status }) => {
  statusEl.textContent = status.replace(/_/g, ' ');
  if (status === 'delivered' || status === 'cancelled') stopSharing();
});

stopBtn.addEventListener('click', stopSharing);

loadStatus();
