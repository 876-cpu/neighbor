// Usage: node src/utils/seedWhitelist.js someone@example.com another@example.com
const { addToWhitelist } = require('./whitelist');

const emails = process.argv.slice(2);
if (emails.length === 0) {
  console.log('Usage: node src/utils/seedWhitelist.js email1@example.com email2@example.com');
  process.exit(1);
}

emails.forEach((email) => {
  addToWhitelist(email);
  console.log(`Added ${email} to whitelist.`);
});
