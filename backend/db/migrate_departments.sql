CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO departments (id, slug, name_ar, icon, sort_order) VALUES
(1, 'home-appliances', 'الأجهزة المنزلية', 'kitchen', 1),
(2, 'bedrooms', 'غرف النوم', 'bed', 2),
(3, 'living-rooms', 'المجالس', 'weekend', 3),
(4, 'kitchens', 'المطابخ', 'countertops', 4),
(5, 'furniture', 'الأثاث', 'chair', 5),
(6, 'solar-energy', 'الطاقة الشمسية', 'solar_power', 6);

-- Add department_id to products if not exists
-- SQLite ALTER TABLE ADD COLUMN does not support IF NOT EXISTS, so we catch the error if it exists.
-- But we can just try to run it.
