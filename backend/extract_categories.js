const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'db', 'zeyad.db'));

try {
  db.exec('ALTER TABLE categories ADD COLUMN department_id INTEGER;');
  console.log('Added department_id to categories.');
} catch (e) {
  console.log('department_id might already exist in categories:', e.message);
}

// Map HTML files to departments
const departmentsMap = {
  'appliances-catalog.html': 1, // الأجهزة المنزلية
  'bedrooms-catalog.html': 2,   // غرف النوم
  'majalis-catalog.html': 3,    // المجالس
  'kitchens-catalog.html': 4,   // المطابخ
  'furniture-catalog.html': 5,  // الأثاث
  'solar-catalog.html': 6       // الطاقة الشمسية
};

const cheerio = require('cheerio');
let added = 0;

for (const [filename, deptId] of Object.entries(departmentsMap)) {
  const filePath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) continue;

  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);

  // Typical classes in these catalogs: 'category-card', 'catalog-card', or nav filters
  // Assuming the user meant standard category labels. 
  // Let's grab them from links or text.
  let cats = new Set();
  
  // Custom logic based on how Zeyad For Business names classes
  $('.category-card span, .catalog-nav a, .category-title, .filter-btn').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 30) cats.add(text);
  });

  cats.forEach(catName => {
    // Generate a simple slug
    const slug = catName.toLowerCase().replace(/\s+/g, '-');
    const code = 'CAT-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Check if exists
    const existing = db.prepare('SELECT id FROM categories WHERE name_ar = ? OR slug = ?').get(catName, slug);
    if (!existing) {
      db.prepare('INSERT INTO categories (code, name_ar, slug, department_id, is_active) VALUES (?, ?, ?, ?, 1)').run(code, catName, slug, deptId);
      added++;
    } else if (!existing.department_id) {
      // Update department if missing
      db.prepare('UPDATE categories SET department_id = ? WHERE id = ?').run(deptId, existing.id);
    }
  });
}

console.log(`Extraction complete. Inserted ${added} categories.`);
db.close();
