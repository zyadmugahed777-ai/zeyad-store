-- 1. Theme Content Table (For the Visual Editor Engine)
CREATE TABLE IF NOT EXISTS theme_content (
  key TEXT PRIMARY KEY,
  type TEXT DEFAULT 'text',
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Global Styling & Settings
CREATE TABLE IF NOT EXISTS theme_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Seed initial theme settings
INSERT OR IGNORE INTO theme_settings (key, value) VALUES ('primary_color', '#eab308');
INSERT OR IGNORE INTO theme_settings (key, value) VALUES ('secondary_color', '#1f2937');
INSERT OR IGNORE INTO theme_settings (key, value) VALUES ('font_family', 'IBM Plex Sans Arabic');

-- 3. Departments (The 6 main independent sections)
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  name_ar TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

-- Seed Departments
INSERT OR IGNORE INTO departments (slug, name_ar, icon, sort_order) VALUES ('home-appliances', 'الأجهزة المنزلية', 'kitchen', 1);
INSERT OR IGNORE INTO departments (slug, name_ar, icon, sort_order) VALUES ('bedrooms', 'غرف النوم', 'bed', 2);
INSERT OR IGNORE INTO departments (slug, name_ar, icon, sort_order) VALUES ('living-rooms', 'المجالس', 'weekend', 3);
INSERT OR IGNORE INTO departments (slug, name_ar, icon, sort_order) VALUES ('kitchens', 'المطابخ', 'countertops', 4);
INSERT OR IGNORE INTO departments (slug, name_ar, icon, sort_order) VALUES ('furniture', 'الأثاث', 'chair', 5);
INSERT OR IGNORE INTO departments (slug, name_ar, icon, sort_order) VALUES ('solar-energy', 'الطاقة الشمسية', 'solar_power', 6);

-- 4. Update Categories to belong to Departments
-- Assuming categories already exist, we add department_id. We'll handle this using ALTER TABLE dynamically in JS.

-- 5. Advanced Products Fields
-- Add PDF, unlimited images (already supported by product_images table), specs JSON, related products
ALTER TABLE products ADD COLUMN department_id INTEGER REFERENCES departments(id);
ALTER TABLE products ADD COLUMN pdf_file TEXT;
ALTER TABLE products ADD COLUMN specifications JSON;
ALTER TABLE products ADD COLUMN related_products JSON; -- array of product IDs
