-- Zeyad For Business Backend - Database Schema
-- SQLite3 - Designed for Guest-First Architecture

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description_ar TEXT,
  image TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  old_price REAL,
  sku TEXT,
  brand TEXT,
  origin TEXT,
  warranty TEXT,
  shipping TEXT,
  delivery_time TEXT,
  installation TEXT,
  weight TEXT,
  video TEXT,
  rating REAL DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_best_seller INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  stock_status TEXT DEFAULT 'in-stock',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_price ON products(price);

-- =============================================
-- PRODUCT IMAGES
-- =============================================
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- =============================================
-- PRODUCT SPECS
-- =============================================
CREATE TABLE IF NOT EXISTS product_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_product_specs_product ON product_specs(product_id);

-- =============================================
-- PRODUCT FAQ
-- =============================================
CREATE TABLE IF NOT EXISTS product_faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_product_faq_product ON product_faq(product_id);

-- =============================================
-- PRODUCT COLORS
-- =============================================
CREATE TABLE IF NOT EXISTS product_colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT NOT NULL
);

CREATE INDEX idx_product_colors_product ON product_colors(product_id);

-- =============================================
-- CUSTOMERS (Auto-created from orders - Guest First)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  city TEXT,
  district TEXT,
  address_detail TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_method_label TEXT,
  delivery_method TEXT,
  city TEXT,
  district TEXT,
  address_detail TEXT,
  notes TEXT,
  whatsapp_message TEXT,
  currency TEXT DEFAULT 'YER',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- =============================================
-- ORDER ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL,
  total REAL NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- =============================================
-- PAYMENTS (Records only - no processing)
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  method_label TEXT,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  reference TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_payments_order ON payments(order_id);

-- =============================================
-- APPOINTMENTS (Showroom visits)
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch TEXT,
  date TEXT,
  time TEXT,
  visit_type TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(date);

-- =============================================
-- CONSULTATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_type TEXT,
  details TEXT,
  attachments TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  contact_method TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_consultations_status ON consultations(status);

-- =============================================
-- DESIGN REQUESTS
-- =============================================
CREATE TABLE IF NOT EXISTS design_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  design_type TEXT,
  dimensions TEXT,
  budget TEXT,
  style_pref TEXT,
  details TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_design_requests_status ON design_requests(status);

-- =============================================
-- QUOTE REQUESTS (B2B / Wholesale)
-- =============================================
CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  project_type TEXT,
  products_details TEXT,
  boq_file TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_quote_requests_status ON quote_requests(status);

-- =============================================
-- CONTACT MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_contact_messages_read ON contact_messages(is_read);

-- =============================================
-- NEWSLETTER
-- =============================================
CREATE TABLE IF NOT EXISTS newsletter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- BRANCHES
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  google_maps TEXT,
  working_hours TEXT,
  image TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- BANNERS
-- =============================================
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  subtitle TEXT,
  image TEXT NOT NULL,
  link TEXT,
  position TEXT DEFAULT 'home',
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_banners_active ON banners(is_active);
CREATE INDEX idx_banners_position ON banners(position);

-- =============================================
-- OFFERS
-- =============================================
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage',
  discount_value REAL DEFAULT 0,
  min_order REAL,
  start_date TEXT,
  end_date TEXT,
  applicable_categories TEXT,
  applicable_products TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_offers_active ON offers(is_active);

-- =============================================
-- MEDIA LIBRARY
-- =============================================
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  path TEXT NOT NULL,
  alt_text TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  reference_id INTEGER,
  title TEXT NOT NULL,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- =============================================
-- SETTINGS (Key-Value store)
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string',
  group_name TEXT DEFAULT 'general',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_group ON settings(group_name);

-- =============================================
-- ADMIN USERS (Separate from customers)
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'admin',
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- GUEST SESSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS guest_sessions (
  guest_id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  last_active_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- CARTS
-- =============================================
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

-- =============================================
-- WISHLISTS
-- =============================================
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
