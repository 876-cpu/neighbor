// Minimal file-based persistence so the project runs with zero external
// services. For real production use, swap this for Postgres/SQLite/etc —
// the function signatures here are intentionally small so that's an easy
// later step; nothing else in the app needs to change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJSON(name, fallback) {
  const p = filePath(name);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  const raw = fs.readFileSync(p, 'utf8');
  return raw.trim() ? JSON.parse(raw) : fallback;
}

// Naive write queue per file so concurrent requests can't corrupt the JSON.
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

module.exports = { readJSON, writeJSON };
