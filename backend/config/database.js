const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '..', 'db', 'zeyad.db');

const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');
const SEED_PATH = path.join(__dirname, '..', 'db', 'seed.sql');

let db;

/**
 * Get database instance (singleton)
 */
function getDb() {
  if (!db) {
    // Ensure db directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Initialize database with schema and seed data
 */
function initDatabase() {
  const database = getDb();

  // Check if tables already exist
  const tableCheck = database.prepare(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='products'"
  ).get();

  if (tableCheck.count === 0) {
    console.log('Initializing database...');

    // Run schema
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
      database.exec(schema);
      console.log('  Schema applied.');
    }

    // Run seed
    if (fs.existsSync(SEED_PATH)) {
      const seed = fs.readFileSync(SEED_PATH, 'utf8');
      database.exec(seed);
      console.log('  Seed data inserted.');
    }

    console.log('Database initialized successfully.');
  } else {
    console.log('Database already initialized.');
  }

  applyAdminSchemaUpgrades(database);

  return database;
}

function hasColumn(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
}

function addColumn(database, table, definition) {
  const column = definition.split(/\s+/)[0];
  if (!hasColumn(database, table, column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

function seedSettings(database) {
  const settings = [
    ['site_name', 'Zeyad For Business', 'string', 'general'],
    ['site_logo', '', 'string', 'branding'],
    ['site_favicon', '', 'string', 'branding'],
    ['contact_phone', '', 'string', 'contact'],
    ['contact_whatsapp', '', 'string', 'contact'],
    ['contact_email', '', 'string', 'contact'],
    ['contact_address', '', 'string', 'contact'],
    ['google_maps_url', '', 'string', 'contact'],
    ['social_facebook', '', 'string', 'social'],
    ['social_instagram', '', 'string', 'social'],
    ['social_tiktok', '', 'string', 'social'],
    ['payment_methods', 'Cash,Bank Transfer,Electronic Wallets,Pickup', 'text', 'payment'],
    ['shipping_methods', "Sana'a Delivery,Governorates Shipping,Pickup", 'text', 'shipping'],
    ['default_currency', 'YER', 'string', 'commerce'],
    ['exchange_rate', '140', 'number', 'commerce'],
    ['exchange_rate_sar_yer', '140', 'number', 'commerce'],
    ['enabled_languages', 'ar,en', 'string', 'localization'],
    ['seo_title', '', 'string', 'seo'],
    ['seo_description', '', 'text', 'seo'],
    ['analytics_head', '', 'text', 'analytics'],
    ['ai_provider', '', 'string', 'ai'],
    ['ai_api_key', '', 'password', 'ai']
  ];

  const insert = database.prepare(`
    INSERT OR IGNORE INTO settings (key, value, type, group_name)
    VALUES (?, ?, ?, ?)
  `);
  settings.forEach((setting) => insert.run(...setting));

  database.prepare(`
    UPDATE settings SET value = '140' WHERE key IN ('exchange_rate', 'exchange_rate_sar_yer')
  `).run();
}

function applyAdminSchemaUpgrades(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      PRIMARY KEY (role_id, permission)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

    INSERT OR IGNORE INTO roles (id, name, description) VALUES
      (1, 'Super Admin', 'Full system access'),
      (2, 'Admin', 'Manage operations and content'),
      (3, 'Editor', 'Manage content and media'),
      (4, 'Sales', 'Manage orders, customers and offers'),
      (5, 'Support', 'Manage notifications and customer support');
  `);

  addColumn(database, 'admin_users', 'role_id INTEGER REFERENCES roles(id) DEFAULT 2');
  addColumn(database, 'admin_users', 'permissions TEXT');

  addColumn(database, 'offers', 'image TEXT');
  addColumn(database, 'offers', 'button_text TEXT');
  addColumn(database, 'offers', 'link TEXT');
  addColumn(database, 'offers', 'coupon_code TEXT');
  addColumn(database, 'offers', 'discount_amount REAL DEFAULT 0');
  addColumn(database, 'offers', 'department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL');
  addColumn(database, 'offers', 'category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
  addColumn(database, 'offers', 'product_id_ref INTEGER REFERENCES products(id) ON DELETE SET NULL');
  addColumn(database, 'offers', 'placement TEXT DEFAULT \'home\'');
  addColumn(database, 'offers', 'status TEXT DEFAULT \'draft\'');
  addColumn(database, 'offers', 'sort_order INTEGER DEFAULT 0');

  addColumn(database, 'banners', 'button_text TEXT');
  addColumn(database, 'banners', 'body TEXT');
  addColumn(database, 'banners', 'status TEXT DEFAULT \'draft\'');
  addColumn(database, 'banners', 'desktop_image TEXT');
  addColumn(database, 'banners', 'mobile_image TEXT');

  addColumn(database, 'media', 'folder TEXT DEFAULT \'general\'');
  addColumn(database, 'media', 'title TEXT');
  addColumn(database, 'media', 'description TEXT');
  addColumn(database, 'media', 'updated_at TEXT DEFAULT (datetime(\'now\'))');

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
    CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_banners_status ON banners(status);
    CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
    CREATE INDEX IF NOT EXISTS idx_media_mime ON media(mime_type);
  `);

  seedSettings(database);

  const permissionMap = {
    1: ['*'],
    2: ['dashboard:view', 'orders:*', 'customers:*', 'branches:*', 'offers:*', 'banners:*', 'media:*', 'pages:*', 'notifications:*', 'settings:*', 'users:view', 'reports:view'],
    3: ['dashboard:view', 'products:view', 'categories:view', 'offers:*', 'banners:*', 'media:*', 'pages:*', 'notifications:view'],
    4: ['dashboard:view', 'orders:*', 'customers:*', 'offers:view', 'notifications:*', 'reports:view'],
    5: ['dashboard:view', 'orders:view', 'customers:view', 'notifications:*']
  };
  const insertPermission = database.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)');
  Object.entries(permissionMap).forEach(([roleId, permissions]) => {
    permissions.forEach((permission) => insertPermission.run(roleId, permission));
  });
}

/**
 * Close database connection
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initDatabase, closeDb };
