const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'economy.db'));

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

  // DAILY CLAIMS METHODS

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
};