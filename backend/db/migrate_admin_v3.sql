-- =============================================
-- Admin Panel V3 Migration
-- Departments, Subcategories, Enhanced Offers/Banners/Media/Products
-- RBAC, Audit Logs, CMS Pages, Notifications
-- =============================================

-- =============================================
-- DEPARTMENTS (fixed list, managed from admin)
-- =============================================
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  image TEXT,
  description_ar TEXT,
  description_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- SUBCATEGORIES (linked to departments)
-- =============================================
CREATE TABLE IF NOT EXISTS subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  image TEXT,
  description_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(department_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_department ON subcategories(department_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active ON subcategories(is_active);

-- =============================================
-- PRODUCT TAGS
-- =============================================
CREATE TABLE IF NOT EXISTS product_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag);

-- =============================================
-- PRODUCT DOCUMENTS (PDF manuals, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS product_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_documents_product ON product_documents(product_id);

-- =============================================
-- RELATED PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS related_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(product_id, related_product_id)
);

CREATE INDEX IF NOT EXISTS idx_related_products_product ON related_products(product_id);

-- =============================================
-- CMS PAGE CONTENT (Visual Editor data)
-- =============================================
CREATE TABLE IF NOT EXISTS cms_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  page_type TEXT DEFAULT 'static',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_elements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  element_key TEXT NOT NULL,
  element_type TEXT DEFAULT 'text',
  content TEXT,
  metadata TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(page_id, element_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_elements_page ON cms_elements(page_id);

-- =============================================
-- CMS REVISIONS (backup & undo)
-- =============================================
CREATE TABLE IF NOT EXISTS cms_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  snapshot TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_revisions_page ON cms_revisions(page_id);

-- =============================================
-- MEDIA FOLDERS
-- =============================================
CREATE TABLE IF NOT EXISTS media_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES media_folders(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(parent_id, slug)
);

-- =============================================
-- NOTIFICATION CHANNELS (for future Email/WhatsApp)
-- =============================================
CREATE TABLE IF NOT EXISTS notification_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  status TEXT DEFAULT 'sent',
  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_notif ON notification_channels(notification_id);

-- =============================================
-- COUPONS (separate from offers for better management)
-- =============================================
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percentage',
  discount_value REAL DEFAULT 0,
  min_order REAL DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  applicable_departments TEXT,
  applicable_categories TEXT,
  applicable_products TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- Seed data moved to run_migrate_v3.js

-- =============================================
-- ADD NEW COLUMNS TO EXISTING TABLES
-- =============================================

-- Products: add department_id, subcategory_id, barcode, seo fields, archive
-- These are handled via ALTER TABLE in the migration script
