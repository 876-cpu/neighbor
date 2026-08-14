const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';

// 1. Auto-create the persistent folder
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 2. Pre-create all files on boot so Railway doesn't crash on first 'open'
['users', 'products', 'orders', 'whitelist'].forEach(name => {
  const p = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '[]');
  }
});

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJSON(name, fallback = []) {
  const p = filePath(name);
  const raw = fs.readFileSync(p, 'utf8');
  return raw.trim()? JSON.parse(raw) : fallback;
}

const queues = {};
function writeJSON(name, data) {
  const p = filePath(name);
  const prev = queues[name] || Promise.resolve();
  const next = prev.then(
    () =>
      new Promise((resolve, reject) => {
        fs.writeFile(p, JSON.stringify(data, null, 2), (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  );
  queues[name] = next.catch(() => {});
  return next;
}

module.exports = { readJSON, writeJSON, DATA_DIR };
