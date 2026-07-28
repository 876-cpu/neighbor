const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET === 'replace_this_with_a_long_random_string') {
  // Fail loudly rather than silently signing tokens with a weak/default secret.
  console.warn(
    '[SECURITY WARNING] JWT_SECRET is missing or still the placeholder value. ' +
      'Set a strong random JWT_SECRET in your .env before deploying.'
  );
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
