const { readJSON, writeJSON } = require('./db');

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

// Returns true if the email is allowed to register.
// Supports two kinds of entries in whitelist.json:
//   "someone@example.com"  -> exact email match
//   "@company.com"         -> allows any address on that domain
function isWhitelisted(email) {
  const normalized = normalizeEmail(email);
  const domain = '@' + normalized.split('@')[1];
  const list = readJSON('whitelist', []);
  return list.some((entry) => {
    const e = normalizeEmail(entry);
    return e === normalized || e === domain;
  });
}

function addToWhitelist(email) {
  const normalized = normalizeEmail(email);
  const list = readJSON('whitelist', []);
  if (!list.map(normalizeEmail).includes(normalized)) {
    list.push(normalized);
    writeJSON('whitelist', list);
  }
  return list;
}

function removeFromWhitelist(email) {
  const normalized = normalizeEmail(email);
  const list = readJSON('whitelist', []).filter(
    (e) => normalizeEmail(e) !== normalized
  );
  writeJSON('whitelist', list);
  return list;
}

function getWhitelist() {
  return readJSON('whitelist', []);
}

module.exports = {
  isWhitelisted,
  addToWhitelist,
  removeFromWhitelist,
  getWhitelist,
  normalizeEmail,
};
