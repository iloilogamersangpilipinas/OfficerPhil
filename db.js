const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 🔹 Use relative path for deployment compatibility
const DATA_FOLDER = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_FOLDER, 'economy.db');

// Ensure /data folder exists
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER);

// Connect to SQLite database
const db = new Database(DB_FILE);

// Create tables if they don't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    userId TEXT PRIMARY KEY,
    balance INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS daily_claims (
    userId TEXT PRIMARY KEY,
    lastClaim INTEGER NOT NULL
  )
`).run();

module.exports = {
  // ---------------- BALANCE METHODS ----------------
  getBalance(userId) {
    const row = db.prepare('SELECT balance FROM balances WHERE userId = ?').get(userId);
    return row ? row.balance : 0;
  },

  setBalance(userId, amount) {
    db.prepare(`
      INSERT INTO balances (userId, balance)
      VALUES (?, ?)
      ON CONFLICT(userId) DO UPDATE SET balance = excluded.balance
    `).run(userId, amount);
  },

  addBalance(userId, amount) {
    const current = module.exports.getBalance(userId);
    module.exports.setBalance(userId, current + amount);
  },

  getAllBalances() {
    return db.prepare('SELECT * FROM balances').all();
  },

  // ---------------- DAILY CLAIMS METHODS ----------------
  getLastDaily(userId) {
    const row = db.prepare('SELECT lastClaim FROM daily_claims WHERE userId = ?').get(userId);
    return row ? row.lastClaim : 0;
  },

  setLastDaily(userId, timestamp) {
    db.prepare(`
      INSERT INTO daily_claims (userId, lastClaim)
      VALUES (?, ?)
      ON CONFLICT(userId) DO UPDATE SET lastClaim = excluded.lastClaim
    `).run(userId, timestamp);
  },

  // ---------------- IMPORT JSON BALANCES ----------------
  importBalancesFromFile() {
    const BALANCE_FILE = path.join(DATA_FOLDER, 'balances.json');
    if (!fs.existsSync(BALANCE_FILE)) {
      console.warn('⚠️ balances.json not found — skipping import.');
      return 0;
    }

    let balances;
    try {
      balances = JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf8'));
    } catch (err) {
      console.error('❌ Failed to parse balances.json:', err);
      return 0;
    }

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

    console.log(`✅ Imported ${count} balances from balances.json`);
    return count;
  }
};

module.exports.importBalancesFromFile();