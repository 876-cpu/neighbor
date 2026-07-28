const express = require('express');
const { body, validationResult } = require('express-validator');

const { readJSON, writeJSON } = require('../utils/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['placed', 'out_for_delivery', 'delivered', 'cancelled'];

// Basic phone validation: digits, spaces, +, -, ( ) — 7 to 20 chars of content.
const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;

// ---------------------------------------------------------------------
// POST /api/orders  (buyer places an order from their cart)
// Prices/titles are looked up server-side from the product catalog —
// never trusted from the client — so a buyer can't tamper with cost.
// ---------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireRole('buyer'),
  [
    body('phone').matches(PHONE_RE).withMessage('Enter a valid phone number.'),
    body('items').isArray({ min: 1 }).withMessage('Cart is empty.'),
    body('items.*.productId').isString().notEmpty(),
    body('items.*.qty').isInt({ min: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const products = readJSON('products', []);
    const lineItems = [];
    for (const { productId, qty } of req.body.items) {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${productId} no longer exists.` });
      }
      lineItems.push({
        productId: product.id,
        title: product.title,
        priceCents: product.priceCents,
        qty,
      });
    }
    const totalCents = lineItems.reduce((sum, i) => sum + i.priceCents * i.qty, 0);

    const orders = readJSON('orders', []);
    const order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      buyerId: req.user.sub,
      buyerEmail: req.user.email,
      phone: req.body.phone,
      items: lineItems,
      totalCents,
      status: 'placed',
      location: null, // filled in via live-location socket updates
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    writeJSON('orders', orders);
    res.status(201).json({ order });
  }
);

// ---------------------------------------------------------------------
// GET /api/orders  (buyer sees their own orders; seller sees all)
// ---------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const orders = readJSON('orders', []);
  const visible =
    req.user.role === 'seller' ? orders : orders.filter((o) => o.buyerId === req.user.sub);
  res.json({ orders: visible });
});

// ---------------------------------------------------------------------
// GET /api/orders/:id  (owning buyer or the seller only)
// ---------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  const order = readJSON('orders', []).find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user.role !== 'seller' && order.buyerId !== req.user.sub) {
    return res.status(403).json({ error: 'Not authorized.' });
  }
  res.json({ order });
});

// ---------------------------------------------------------------------
// PATCH /api/orders/:id/status  (seller only — advance delivery status)
// ---------------------------------------------------------------------
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('seller'),
  [body('status').isIn(VALID_STATUSES)],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid status.' });

    const orders = readJSON('orders', []);
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found.' });

    orders[idx].status = req.body.status;
    writeJSON('orders', orders);

    const io = req.app.get('io');
    if (io) io.to(`order:${orders[idx].id}`).emit('order:status', { orderId: orders[idx].id, status: orders[idx].status });

    res.json({ order: orders[idx] });
  }
);

module.exports = router;
