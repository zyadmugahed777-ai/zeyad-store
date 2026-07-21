const { getDb } = require('./config/database');

const db = getDb();

try {
  // Check if home page has sections
  const home = db.prepare("SELECT id FROM pages WHERE slug = 'home'").get();
  if (home) {
    const sectionCount = db.prepare("SELECT COUNT(*) as c FROM page_sections WHERE page_id = ?").get(home.id).c;
    
    if (sectionCount === 0) {
      console.log('Seeding Home Page Sections...');
      
      const insertSection = db.prepare("INSERT INTO page_sections (page_id, section_type, name, sort_order) VALUES (?, ?, ?, ?)");
      const insertBlock = db.prepare("INSERT INTO content_blocks (section_id, key, type, value) VALUES (?, ?, ?, ?)");
      
      db.transaction(() => {
        // 1. Hero Section
        const heroId = insertSection.run(home.id, 'hero', 'قسم الترحيب (Hero)', 0).lastInsertRowid;
        insertBlock.run(heroId, 'title', 'text', 'تجهيز كامل للفنادق والمطاعم');
        insertBlock.run(heroId, 'subtitle', 'text', 'معدات عالية الجودة، ضمان طويل الأمد، وخدمة ما بعد البيع استثنائية.');
        insertBlock.run(heroId, 'button_text', 'text', 'تصفح الكتالوج');
        insertBlock.run(heroId, 'button_link', 'link', '/products');
        insertBlock.run(heroId, 'background_image', 'image', '/uploads/media/default-hero.jpg');
        
        // 2. Features Section
        const featId = insertSection.run(home.id, 'features', 'المميزات', 1).lastInsertRowid;
        insertBlock.run(featId, 'feature_1_title', 'text', 'جودة أصلية');
        insertBlock.run(featId, 'feature_1_icon', 'text', 'verified');
        insertBlock.run(featId, 'feature_2_title', 'text', 'ضمان شامل');
        insertBlock.run(featId, 'feature_2_icon', 'text', 'security');
        
        // 3. Offers Section
        const offersId = insertSection.run(home.id, 'offers', 'العروض الخاصة', 2).lastInsertRowid;
        insertBlock.run(offersId, 'title', 'text', 'عروض الموسم لا تفوتها');
        
        // 4. Categories Section
        const catId = insertSection.run(home.id, 'categories', 'التصنيفات البارزة', 3).lastInsertRowid;
        insertBlock.run(catId, 'title', 'text', 'تصفح حسب التصنيف');
      })();
      console.log('Home Page seeded successfully.');
    }
  }
} catch (e) {
  console.log('Seed Error:', e.message);
}
