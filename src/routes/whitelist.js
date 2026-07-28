const express = require('express');
const { body, validationResult } = require('express-validator');

const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
} = require('../utils/whitelist');

const router = express.Router();

// Only the seller can view or edit the approved contact list.
router.use(requireAuth, requireRole('seller'));

router.get('/', (req, res) => {
  res.json({ whitelist: getWhitelist() });
});

router.post('/', [body('email').isString().notEmpty()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Email required.' });
  const list = addToWhitelist(req.body.email);
  res.status(201).json({ whitelist: list });
});

router.delete('/:email', (req, res) => {
  const list = removeFromWhitelist(req.params.email);
  res.json({ whitelist: list });
});

module.exports = router;
