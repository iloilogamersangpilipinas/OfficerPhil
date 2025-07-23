const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'economy.db'));

// Create table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    userId TEXT PRIMARY KEY,
    balance INTEGER NOT NULL
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
  }
};