/**
 * Migration Script: Admin Panel V3
 * Run: node run_migrate_v3.js
 * 
 * Applies:
 * - New tables (departments, subcategories, product_tags, etc.)
 * - New columns on existing tables (products, offers, banners, media)
 * - Default department seeding
 */
const { getDb } = require('./config/database');
const fs = require('fs');
const path = require('path');

const db = getDb();

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}

function addColumn(table, definition) {
  const col = definition.split(/\s+/)[0];
  if (!hasColumn(table, col)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
      console.log(`  ✓ Added column ${col} to ${table}`);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.error(`  ✗ Error adding ${col} to ${table}:`, e.message);
      }
    }
  }
}

try {
  console.log('\n========================================');
  console.log('  Admin Panel V3 Migration');
  console.log('========================================\n');

  // 1.5 Enhance departments table
  console.log('Step 1.5: Enhancing departments table...');
  addColumn('departments', 'name_en TEXT');
  addColumn('departments', 'image TEXT');
  addColumn('departments', 'description_ar TEXT');
  addColumn('departments', 'description_en TEXT');
  addColumn('departments', 'created_at TEXT');
  addColumn('departments', 'updated_at TEXT');
  console.log('');

  // 1. Run SQL migration file
  console.log('Step 1: Creating new tables...');
  const sqlPath = path.join(__dirname, 'db', 'migrate_admin_v3.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  try {
    db.exec(sql);
    console.log('  ✓ New tables created\n');
  } catch (e) {
    console.error('  ✗ Error creating tables:', e.message);
  }

  // 2. Add new columns to products
  console.log('Step 2: Enhancing products table...');
  addColumn('products', 'department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL');
  addColumn('products', 'subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL');
  addColumn('products', 'barcode TEXT');
  addColumn('products', 'seo_title TEXT');
  addColumn('products', 'seo_description TEXT');
  addColumn('products', 'seo_keywords TEXT');
  addColumn('products', 'is_archived INTEGER DEFAULT 0');
  addColumn('products', 'stock_quantity INTEGER DEFAULT 0');
  addColumn('products', 'low_stock_threshold INTEGER DEFAULT 5');
  addColumn('products', 'warranty_months INTEGER DEFAULT 0');
  addColumn('products', 'discount_percentage REAL DEFAULT 0');
  addColumn('products', 'discount_amount REAL DEFAULT 0');
  addColumn('products', 'discount_start TEXT');
  addColumn('products', 'discount_end TEXT');
  addColumn('products', 'pdf_file TEXT');
  addColumn('products', 'tags TEXT');
  console.log('');

  // 3. Enhance offers table
  console.log('Step 3: Enhancing offers table...');
  addColumn('offers', 'image TEXT');
  addColumn('offers', 'button_text TEXT');
  addColumn('offers', 'link TEXT');
  addColumn('offers', 'coupon_code TEXT');
  addColumn('offers', 'discount_amount REAL DEFAULT 0');
  addColumn('offers', 'department_id INTEGER');
  addColumn('offers', 'category_id INTEGER');
  addColumn('offers', 'product_id_ref INTEGER');
  addColumn('offers', 'placement TEXT DEFAULT \'home\'');
  addColumn('offers', 'status TEXT DEFAULT \'draft\'');
  addColumn('offers', 'sort_order INTEGER DEFAULT 0');
  console.log('');

  // 4. Enhance banners table
  console.log('Step 4: Enhancing banners table...');
  addColumn('banners', 'button_text TEXT');
  addColumn('banners', 'body TEXT');
  addColumn('banners', 'status TEXT DEFAULT \'draft\'');
  addColumn('banners', 'desktop_image TEXT');
  addColumn('banners', 'mobile_image TEXT');
  addColumn('banners', 'department_id INTEGER');
  addColumn('banners', 'category_id INTEGER');
  addColumn('banners', 'product_id_ref INTEGER');
  console.log('');

  // 5. Enhance media table
  console.log('Step 5: Enhancing media table...');
  addColumn('media', 'folder TEXT DEFAULT \'general\'');
  addColumn('media', 'folder_id INTEGER REFERENCES media_folders(id) ON DELETE SET NULL');
  addColumn('media', 'title TEXT');
  addColumn('media', 'description TEXT');
  addColumn('media', 'width INTEGER');
  addColumn('media', 'height INTEGER');
  addColumn('media', 'thumbnail_path TEXT');
  addColumn('media', 'updated_at TEXT');
  console.log('');

  // 6. Create indexes
  console.log('Step 6: Creating indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_products_department ON products(department_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_archived ON products(is_archived)',
    'CREATE INDEX IF NOT EXISTS idx_offers_department ON offers(department_id)',
    'CREATE INDEX IF NOT EXISTS idx_banners_department ON banners(department_id)',
    'CREATE INDEX IF NOT EXISTS idx_media_folder_id ON media(folder_id)'
  ];
  indexes.forEach(idx => {
    try { db.exec(idx); } catch(e) { /* ignore */ }
  });
  console.log('  ✓ Indexes created\n');

  // 7. Seed CMS pages
  console.log('Step 7: Seeding CMS pages...');
  const cmsPages = [
    ['index', 'الصفحة الرئيسية', 'Home Page', 'main'],
    ['appliances', 'الأجهزة المنزلية', 'Home Appliances', 'department'],
    ['appliances-catalog', 'كتالوج الأجهزة', 'Appliances Catalog', 'catalog'],
    ['bedrooms', 'غرف النوم', 'Bedrooms', 'department'],
    ['bedrooms-catalog', 'كتالوج غرف النوم', 'Bedrooms Catalog', 'catalog'],
    ['majalis', 'المجالس', 'Living Rooms', 'department'],
    ['majalis-catalog', 'كتالوج المجالس', 'Majalis Catalog', 'catalog'],
    ['kitchens', 'المطابخ', 'Kitchens', 'department'],
    ['kitchens-catalog', 'كتالوج المطابخ', 'Kitchens Catalog', 'catalog'],
    ['furniture', 'الأثاث', 'Furniture', 'department'],
    ['furniture-catalog', 'كتالوج الأثاث', 'Furniture Catalog', 'catalog'],
    ['solar', 'الطاقة الشمسية', 'Solar Energy', 'department'],
    ['solar-catalog', 'كتالوج الطاقة الشمسية', 'Solar Catalog', 'catalog'],
    ['offers', 'العروض', 'Offers', 'static'],
    ['about', 'من نحن', 'About Us', 'static'],
    ['contact', 'تواصل معنا', 'Contact', 'static'],
    ['cart', 'سلة التسوق', 'Cart', 'static'],
    ['checkout', 'إتمام الطلب', 'Checkout', 'static'],
    ['wishlist', 'المفضلة', 'Wishlist', 'static'],
    ['compare', 'المقارنة', 'Compare', 'static'],
    ['search', 'البحث', 'Search', 'static'],
    ['product', 'صفحة المنتج', 'Product Page', 'template'],
    ['faq', 'الأسئلة الشائعة', 'FAQ', 'static'],
    ['warranty', 'الضمان', 'Warranty', 'static'],
    ['delivery', 'التوصيل', 'Delivery', 'static'],
    ['terms', 'الشروط والأحكام', 'Terms', 'static'],
    ['privacy', 'سياسة الخصوصية', 'Privacy', 'static'],
    ['returns', 'سياسة الإرجاع', 'Returns', 'static'],
    ['branches', 'الفروع', 'Branches', 'static'],
    ['support', 'الدعم', 'Support', 'static'],
    ['track-order', 'تتبع الطلب', 'Track Order', 'static'],
    ['book-appointment', 'حجز موعد', 'Book Appointment', 'static'],
    ['consultation', 'الاستشارة', 'Consultation', 'static'],
    ['design-request', 'طلب تصميم', 'Design Request', 'static'],
    ['quote-request', 'طلب عرض سعر', 'Quote Request', 'static'],
    ['collections', 'المجموعات', 'Collections', 'static'],
    ['best-sellers', 'الأكثر مبيعاً', 'Best Sellers', 'static'],
    ['new-arrivals', 'وصل حديثاً', 'New Arrivals', 'static']
  ];

  const insertPage = db.prepare('INSERT OR IGNORE INTO cms_pages (slug, title_ar, title_en, page_type) VALUES (?, ?, ?, ?)');
  cmsPages.forEach(p => insertPage.run(...p));
  console.log(`  ✓ ${cmsPages.length} CMS pages seeded\n`);

  console.log('Step 8: Seeding Departments...');
  const deps = [
    ['home-appliances', 'الأجهزة المنزلية', 'Home Appliances', 'kitchen', 1],
    ['bedrooms', 'غرف النوم', 'Bedrooms', 'bed', 2],
    ['living-rooms', 'المجالس', 'Living Rooms', 'weekend', 3],
    ['kitchens', 'المطابخ', 'Kitchens', 'countertops', 4],
    ['furniture', 'الأثاث', 'Furniture', 'chair', 5],
    ['solar-energy', 'الطاقة الشمسية', 'Solar Energy', 'solar_power', 6]
  ];
  const insertDep = db.prepare('INSERT OR IGNORE INTO departments (slug, name_ar, name_en, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
  deps.forEach(d => insertDep.run(...d));
  console.log(`  ✓ Departments seeded\n`);

  console.log('========================================');
  console.log('  Migration Complete!');
  console.log('========================================\n');

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
