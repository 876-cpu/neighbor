const cookie = require('cookie');

const { readJSON, writeJSON } = require('../utils/db');
const { verifyToken } = require('../utils/tokens');

const CLOSED_STATUSES = ['delivered', 'cancelled'];

function getOrder(orderId) {
  return readJSON('orders', []).find((o) => o.id === orderId);
}

function attachLocationSocket(io) {
  // Authenticate every socket connection using the same httpOnly JWT
  // cookie the REST API uses — no separate token scheme to manage.
  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie || '';
      const parsed = cookie.parse(raw);
      if (!parsed.token) return next(new Error('unauthorized'));
      socket.data.user = verifyToken(parsed.token);
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    // Join the room for a specific order. Only that order's buyer or the
    // (single) seller may join — this is what scopes who can see/send
    // location updates for it.
    socket.on('order:join', ({ orderId }) => {
      const order = getOrder(orderId);
      if (!order) return;
      const isOwner = order.buyerId === user.sub;
      const isSeller = user.role === 'seller';
      if (!isOwner && !isSeller) return;
      socket.join(`order:${orderId}`);

      // Send the last known location immediately so a seller opening the
      // tracking page isn't stuck waiting for the buyer's next GPS tick.
      if (order.location) {
        socket.emit('location:update', { orderId, ...order.location });
      }
    });

    // Buyer's device streams GPS updates while the order is active.
    socket.on('location:update', ({ orderId, lat, lng, accuracy }) => {
      const order = getOrder(orderId);
      if (!order) return;
      if (order.buyerId !== user.sub) return; // only the order's own buyer can push updates
      if (CLOSED_STATUSES.includes(order.status)) return; // no updates after delivery/cancel

      const location = { lat, lng, accuracy, updatedAt: new Date().toISOString() };
      const orders = readJSON('orders', []);
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx === -1) return;
      orders[idx].location = location;
      writeJSON('orders', orders);

      io.to(`order:${orderId}`).emit('location:update', { orderId, ...location });
    });

    socket.on('location:stop', ({ orderId }) => {
      const order = getOrder(orderId);
      if (!order || order.buyerId !== user.sub) return;
      io.to(`order:${orderId}`).emit('location:stopped', { orderId });
    });
  });
}

module.exports = attachLocationSocket;
