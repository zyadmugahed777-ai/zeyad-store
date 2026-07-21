-- =============================================
-- Zeyad For Business Backend V2 - Schema Update
-- =============================================

-- 1. RBAC (Role Based Access Control)
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

-- Insert Default Roles
INSERT OR IGNORE INTO roles (id, name, description) VALUES
  (1, 'Super Admin', 'صلاحيات كاملة للتحكم بالموقع'),
  (2, 'Admin', 'مدير النظام'),
  (3, 'Editor', 'محرر محتوى'),
  (4, 'Sales', 'المبيعات'),
  (5, 'Support', 'الدعم الفني');

-- Add role_id to admin_users (if not exists)
-- Since SQLite doesn't easily support IF NOT EXISTS for ADD COLUMN, we'll handle this in JS if needed,
-- but a safe way is to just add it and catch the error if it exists.
-- ALTER TABLE admin_users ADD COLUMN role_id INTEGER REFERENCES roles(id) DEFAULT 2;

-- 2. Audit Logs
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

-- 3. CMS / Page Builder
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- e.g., 'hero', 'features', 'products_carousel'
  name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  styles TEXT, -- JSON holding colors, padding, etc.
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES page_sections(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- e.g., 'main_heading', 'button_text', 'hero_image'
  type TEXT DEFAULT 'text', -- 'text', 'image', 'link', 'color', 'html'
  value TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_blocks_section ON content_blocks(section_id);

-- Insert Default Home Page
INSERT OR IGNORE INTO pages (id, title, slug) VALUES (1, 'الصفحة الرئيسية', 'home');

-- 4. Expanded Products Table
-- Adding fields to products: barcode, short_description, tags, keywords
-- We will run ALTER TABLE via JS script to handle "duplicate column" safely.

-- 5. Expanded Media Table
-- ALTER TABLE media ADD COLUMN folder TEXT DEFAULT 'general';

