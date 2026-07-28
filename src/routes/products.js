const express = require('express');
const { body, validationResult } = require('express-validator');

const { readJSON, writeJSON } = require('../utils/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Storefront browsing is for buyers only. The seller dashboard uses the
// separate /manage endpoint below instead of sharing this one.
router.get('/', requireAuth, requireRole('buyer'), (req, res) => {
  res.json({ products: readJSON('products', []) });
});

// Seller-only listing for the dashboard. Registered before the /:id route
// below so "manage" isn't swallowed as if it were a product id.
router.get('/manage', requireAuth, requireRole('seller'), (req, res) => {
  res.json({ products: readJSON('products', []) });
});

router.get('/:id', requireAuth, requireRole('buyer'), (req, res) => {
  const product = readJSON('products', []).find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product });
});

// Only the single seller can create/edit/delete products.
router.post(
  '/',
  requireAuth,
  requireRole('seller'),
  [
    body('title').trim().isLength({ min: 1 }),
    body('priceCents').isInt({ min: 0 }),
    body('description').optional().trim(),
    body('stock').optional().isInt({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const products = readJSON('products', []);
    const product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: req.body.title,
      description: req.body.description || '',
      priceCents: req.body.priceCents,
      stock: req.body.stock ?? 0,
      createdAt: new Date().toISOString(),
    };
    products.push(product);
    writeJSON('products', products);
    res.status(201).json({ product });
  }
);

router.put('/:id', requireAuth, requireRole('seller'), (req, res) => {
  const products = readJSON('products', []);
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });

  const allowed = ['title', 'description', 'priceCents', 'stock'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) products[idx][key] = req.body[key];
  }
  writeJSON('products', products);
  res.json({ product: products[idx] });
});

router.delete('/:id', requireAuth, requireRole('seller'), (req, res) => {
  const products = readJSON('products', []).filter((p) => p.id !== req.params.id);
  writeJSON('products', products);
  res.json({ ok: true });
});

module.exports = router;
