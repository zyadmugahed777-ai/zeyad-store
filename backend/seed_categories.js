const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'db', 'zeyad.db'));

const seedData = {
  1: ['ثلاجات', 'غسالات', 'شاشات', 'مكيفات', 'أفران', 'ميكرويف', 'بوتاجازات', 'خلاطات'],
  2: ['غرف ماليزي', 'غرف سويدي', 'غرف ملكي', 'غرف مودرن', 'غرف أطفال', 'دواليب', 'تسريحات'],
  3: ['مجالس ملكية', 'مجالس شعبية', 'كنب زاوية', 'طاولات مجالس', 'اكسسوارات مجالس'],
  4: ['مطابخ المنيوم', 'مطابخ خشب', 'مطابخ مودرن', 'اكسسوارات مطابخ', 'طاولات طعام'],
  5: ['أطقم كنب', 'طاولات تلفزيون', 'مكاتب دراسة', 'كراسي استرخاء', 'أثاث خارجي'],
  6: ['ألواح شمسية', 'بطاريات جل', 'بطاريات ليثيوم', 'محولات (انفرتر)', 'منظمات شحن']
};

let inserted = 0;
for (const [deptId, categories] of Object.entries(seedData)) {
  categories.forEach((catName, idx) => {
    const slug = catName.toLowerCase().replace(/\s+/g, '-');
    const code = 'CAT-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // insert
    try {
      db.prepare('INSERT INTO categories (code, name_ar, slug, department_id, is_active, sort_order) VALUES (?, ?, ?, ?, 1, ?)').run(code, catName, slug, deptId, idx + 1);
      inserted++;
    } catch (e) {
      console.log('Skipped', catName, e.message);
    }
  });
}

console.log(`Inserted ${inserted} categories manually.`);
db.close();
