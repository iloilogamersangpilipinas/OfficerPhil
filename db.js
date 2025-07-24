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

// Create inventory table (tracks how many of each item a user has)
db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory (
    userId TEXT,
    item TEXT,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (userId, item)
  )
`).run();

module.exports = {
  // BALANCE FUNCTIONS
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

  // DAILY CLAIM FUNCTIONS
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

  // INVENTORY FUNCTIONS

  // Add a quantity of an item to a user's inventory
  addItem(userId, item, quantity = 1) {
    const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    if (row) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE userId = ? AND item = ?').run(quantity, userId, item);
    } else {
      db.prepare('INSERT INTO inventory (userId, item, quantity) VALUES (?, ?, ?)').run(userId, item, quantity);
    }
  },

  // Check if user has at least one of the specified item
  hasItem(userId, item) {
    const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    return row && row.quantity > 0;
  },

  // Remove quantity of an item from user inventory, remove row if quantity falls to zero or below
  removeItem(userId, item, quantity = 1) {
    const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    if (!row || row.quantity < quantity) return false; // not enough items

    if (row.quantity === quantity) {
      db.prepare('DELETE FROM inventory WHERE userId = ? AND item = ?').run(userId, item);
    } else {
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE userId = ? AND item = ?').run(quantity, userId, item);
    }
    return true;
  },

  // Get a user's full inventory as an array of {item, quantity}
  getInventory(userId) {
    return db.prepare('SELECT item, quantity FROM inventory WHERE userId = ?').all(userId);
  }
};