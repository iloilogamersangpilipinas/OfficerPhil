const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'economy.db'));

// ─── Tables ──────────────────────────────────────────

// User balances
db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    userId TEXT PRIMARY KEY,
    balance INTEGER NOT NULL
  )
`).run();

// Daily claims
db.prepare(`
  CREATE TABLE IF NOT EXISTS daily_claims (
    userId TEXT PRIMARY KEY,
    lastClaim INTEGER NOT NULL
  )
`).run();

// Inventory with quantity
db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory (
    userId TEXT,
    item TEXT,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (userId, item)
  )
`).run();

// Shop item metadata
db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_items (
    item TEXT PRIMARY KEY,
    description TEXT,
    price INTEGER
  )
`).run();

// ─── Exported Functions ────────────────────────────────

module.exports = {
  // ── Balances ──
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

  // ── Daily ──
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

  // ── Inventory ──
  addItem(userId, item, quantity = 1) {
    const existing = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    if (existing) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE userId = ? AND item = ?').run(quantity, userId, item);
    } else {
      db.prepare('INSERT INTO inventory (userId, item, quantity) VALUES (?, ?, ?)').run(userId, item, quantity);
    }
  },

  removeItem(userId, item, quantity = 1) {
    const existing = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    if (!existing) return;

    if (existing.quantity > quantity) {
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE userId = ? AND item = ?').run(quantity, userId, item);
    } else {
      db.prepare('DELETE FROM inventory WHERE userId = ? AND item = ?').run(userId, item);
    }
  },

  hasItem(userId, item, quantity = 1) {
    const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    return row && row.quantity >= quantity;
  },

  getInventory(userId) {
    return db.prepare('SELECT item, quantity FROM inventory WHERE userId = ?').all(userId);
  },

  getItemQuantity(userId, item) {
    const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND item = ?').get(userId, item);
    return row ? row.quantity : 0;
  },

  // ── Shop Items (Metadata) ──
  addShopItem(item, description, price) {
    db.prepare(`
      INSERT INTO shop_items (item, description, price)
      VALUES (?, ?, ?)
      ON CONFLICT(item) DO UPDATE SET description = excluded.description, price = excluded.price
    `).run(item, description, price);
  },

  getShopItem(item) {
    return db.prepare('SELECT * FROM shop_items WHERE item = ?').get(item);
  },

  getAllShopItems() {
    return db.prepare('SELECT * FROM shop_items').all();
  }
};