const fs = require('fs');
const path = require('path');
const db = require('./db');

const jsonPath = path.join(__dirname, 'balances.json');
if (!fs.existsSync(jsonPath)) {
  console.log('No balances.json found.');
  process.exit(1);
}

const balances = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
for (const [userId, balance] of Object.entries(balances)) {
  db.setBalance(userId, balance);
  console.log(`Migrated ${userId} => ${balance}`);
}

console.log('✅ Migration complete.');