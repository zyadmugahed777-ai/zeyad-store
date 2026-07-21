const Database = require('better-sqlite3');
const db = new Database('./db/zeyad.db');

db.exec(`
CREATE TABLE IF NOT EXISTS guest_sessions (
  guest_id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  last_active_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  guest_id TEXT REFERENCES guest_sessions(guest_id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id),
  UNIQUE(guest_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  guest_id TEXT REFERENCES guest_sessions(guest_id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id),
  UNIQUE(guest_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(wishlist_id, product_id)
);
`);

console.log('Cart tables created successfully.');
