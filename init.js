const fs = require('fs');
const path = require('path');

const dataDir = '/data';
const whitelistPath = path.join(dataDir, 'whitelist.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultWhitelist = ["clementmanyembere@gmail.com"];

if (!fs.existsSync(whitelistPath)) {
  fs.writeFileSync(whitelistPath, JSON.stringify(defaultWhitelist, null, 2));
  console.log('whitelist created');
} else {
  console.log('whitelist already exists');
}

console.log('Init done. Starting server...');
require('./src/server.js');
