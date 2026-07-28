const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { readJSON, writeJSON } = require('../utils/db');
const { isWhitelisted, normalizeEmail } = require('../utils/whitelist');
const { signToken } = require('../utils/tokens');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Slow down brute-force / enumeration attempts on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------
// POST /api/auth/register  (buyers only — must be on the whitelist)
// ---------------------------------------------------------------------
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email required.'),
    body('password')
      .isLength({ min: 10 })
      .withMessage('Password must be at least 10 characters.'),
    body('name').trim().isLength({ min: 1 }).withMessage('Name required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const email = normalizeEmail(req.body.email);
    const { password, name } = req.body;

    // The core requirement: reject anyone not on the approved contact list
    // BEFORE revealing anything else about the system.
    if (!isWhitelisted(email)) {
      return res.status(403).json({
        error:
          'This email is not on the approved list. Ask the seller to add you, then try again.',
      });
    }

    const users = readJSON('users', []);
    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      name,
      passwordHash,
      role: 'buyer',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeJSON('users', users);

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }
);

// ---------------------------------------------------------------------
// POST /api/auth/setup-seller  (one-time — creates THE single seller account)
// Requires SELLER_SETUP_TOKEN from .env. Rotate/remove it after first use.
// ---------------------------------------------------------------------
router.post(
  '/setup-seller',
  authLimiter,
  [
    body('setupToken').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 12 }),
    body('name').trim().isLength({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    if (
      !process.env.SELLER_SETUP_TOKEN ||
      req.body.setupToken !== process.env.SELLER_SETUP_TOKEN
    ) {
      return res.status(403).json({ error: 'Invalid setup token.' });
    }

    const users = readJSON('users', []);
    if (users.some((u) => u.role === 'seller')) {
      return res
        .status(409)
        .json({ error: 'A seller account already exists. This system supports exactly one.' });
    }

    const email = normalizeEmail(req.body.email);
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const seller = {
      id: `usr_${Date.now()}_seller`,
      email,
      name: req.body.name,
      passwordHash,
      role: 'seller',
      createdAt: new Date().toISOString(),
    };
    users.push(seller);
    writeJSON('users', users);

    const token = signToken({ sub: seller.id, email: seller.email, role: seller.role });
    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({ user: { id: seller.id, email: seller.email, name: seller.name, role: seller.role } });
  }
);

// ---------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------
router.post(
  '/login',
  authLimiter,
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const email = normalizeEmail(req.body.email);
    const users = readJSON('users', []);
    const user = users.find((u) => u.email === email);

    // Same generic error whether the email doesn't exist or the password is
    // wrong — don't let login responses reveal which accounts exist.
    const genericError = { error: 'Invalid email or password.' };
    if (!user) return res.status(401).json(genericError);

    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) return res.status(401).json(genericError);

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }
);

// ---------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  const users = readJSON('users', []);
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

module.exports = router;
