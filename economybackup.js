const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_FOLDER = path.join(__dirname, 'data'); // same as db.js
const DB_FILE = path.join(DATA_FOLDER, 'economy.db');
const BALANCE_FILE = path.join(DATA_FOLDER, 'balances.json');

if (!fs.existsSync(BALANCE_FILE)) {
  console.error('❌ balances.json not found!');
  process.exit(1);
}

const balances = JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf8'));
const db = new Database(DB_FILE);

db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    userId TEXT PRIMARY KEY,
    balance INTEGER NOT NULL
  )
`).run();

const stmt = db.prepare(`
  INSERT INTO balances (userId, balance)
  VALUES (@userId, @balance)
  ON CONFLICT(userId) DO UPDATE SET balance = excluded.balance
`);

let count = 0;
for (const [userId, balance] of Object.entries(balances)) {
  stmt.run({ userId, balance: Number(balance) || 0 });
  count++;
}

console.log(`✅ Imported ${count} balances into economy.db`);