const fs = require('fs');
const Database = require('better-sqlite3');

// 🔹 Hardcoded paths
const DB_FILE = '/Users/remjaenkrafft/Documents/OfficerPhil/data/economy.db';
const BALANCE_FILE = '/Users/remjaenkrafft/Documents/OfficerPhil/data/balances.json';

// Check if balance.json exists
if (!fs.existsSync(BALANCE_FILE)) {
  console.error('❌ balance.json not found!');
  process.exit(1);
}

// Read balances
let balances;
try {
  balances = JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf8'));
} catch (err) {
  console.error('❌ Failed to parse balance.json:', err);
  process.exit(1);
}

// Connect to SQLite
const db = new Database(DB_FILE);

// Make sure balances table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    userId TEXT PRIMARY KEY,
    balance INTEGER NOT NULL
  )
`).run();

// UPSERT statement
const insertOrUpdate = db.prepare(`
  INSERT INTO balances (userId, balance)
  VALUES (@userId, @balance)
  ON CONFLICT(userId) DO UPDATE SET balance = excluded.balance
`);

// Import all balances
let count = 0;
for (const [userId, balance] of Object.entries(balances)) {
  insertOrUpdate.run({
    userId,
    balance: Number(balance) || 0
  });
  count++;
}

console.log(`✅ Successfully imported ${count} balances into economy.db`);