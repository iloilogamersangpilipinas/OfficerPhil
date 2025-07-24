const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'economy.db'));

// Create balances table
db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    userId TEXT PRIMARY KEY,
    balance INTEGER NOT NULL
  )
`).run();

// Create daily claims table
db.prepare(`
  CREATE TABLE IF NOT EXISTS daily_claims (
    userId TEXT PRIMARY KEY,
    lastClaim INTEGER NOT NULL
  )
`).run();

// Create inventory table
db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory (
    userId TEXT,
    item TEXT,
    PRIMARY KEY (userId, item)
  )
`).run();

// Create item usage table for tracking limited uses (fishing rod, bible, etc)
db.prepare(`
  CREATE TABLE IF NOT EXISTS item_usage (
    userId TEXT,
    item TEXT,
    usesLeft INTEGER,
    PRIMARY KEY (userId, item)
  )
`).run();

module.exports = {
  // Balance functions
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

  // Daily claim functions
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

  // Inventory functions
  addItem(userId, item) {
    db.prepare(`
      INSERT INTO inventory (userId, item)
      VALUES (?, ?)
      ON CONFLICT(userId, item) DO NOTHING
    `).run(userId, item);
  },

  hasItem(userId, item) {
    const row = db.prepare('SELECT 1 FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    return !!row;
  },

  removeItem(userId, item) {
    db.prepare('DELETE FROM inventory WHERE userId = ? AND item = ?').run(userId, item);
  },

  getInventory(userId) {
    const rows = db.prepare('SELECT item FROM inventory WHERE userId = ?').all(userId);
    return rows.map(r => r.item);
  },

  // Item usage tracking for limited-use items
  getUsesLeft(userId, item) {
    const row = db.prepare('SELECT usesLeft FROM item_usage WHERE userId = ? AND item = ?').get(userId, item);
    return row ? row.usesLeft : null;
  },

  setUsesLeft(userId, item, usesLeft) {
    if (usesLeft <= 0) {
      // Remove usage record when no uses left
      db.prepare('DELETE FROM item_usage WHERE userId = ? AND item = ?').run(userId, item);
    } else {
      db.prepare(`
        INSERT INTO item_usage (userId, item, usesLeft)
        VALUES (?, ?, ?)
        ON CONFLICT(userId, item) DO UPDATE SET usesLeft = excluded.usesLeft
      `).run(userId, item, usesLeft);
    }
  },

  decrementUse(userId, item) {
    const usesLeft = module.exports.getUsesLeft(userId, item);
    if (usesLeft === null) return; // no usage tracking for this item
    if (usesLeft > 1) {
      module.exports.setUsesLeft(userId, item, usesLeft - 1);
    } else {
      // Remove the item and usage tracking when uses run out
      module.exports.removeItem(userId, item);
      module.exports.setUsesLeft(userId, item, 0);
    }
  }
};