const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/data';
const WHITELIST_PATH = path.join(DATA_DIR, 'whitelist.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Use python to write the file so we control the content
const pyCode = `
import json, os
p = '/data/whitelist.json'
os.makedirs('/data', exist_ok=True)
with open(p, 'w') as f:
    json.dump(["clementmanyembere@gmail.co"], f, indent=2)
print("whitelist created")
`;

fs.writeFileSync('temp_init.py', pyCode);
execSync('python3 temp_init.py');
fs.unlinkSync('temp_init.py');

console.log('Init done. Starting server...');
require('./src/server.js');
