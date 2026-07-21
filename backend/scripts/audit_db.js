const db = require('better-sqlite3')('db/zeyad.db');

// 1. List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('=== TABLES ===');
console.log(tables.map(t => t.name).join(', '));

// 2. Check critical columns
function checkCol(table, col) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
  const found = cols.some(c => c.name === col);
  if (!found) console.log('MISSING: ' + table + '.' + col);
  return found;
}

console.log('\n=== COLUMN CHECKS ===');
// products columns
['department_id','short_description','barcode','tags'].forEach(c => checkCol('products', c));
// offers columns  
['image','button_text','link','coupon_code','discount_amount','department_id','category_id','product_id_ref','placement','status','sort_order'].forEach(c => checkCol('offers', c));
// banners columns
['button_text','body','status','desktop_image','mobile_image'].forEach(c => checkCol('banners', c));
// categories columns
['department_id'].forEach(c => checkCol('categories', c));

// 3. Check if CMS tables exist
['departments','subcategories','cms_pages','cms_elements','cms_revisions','theme_content','theme_content_revisions','audit_logs','roles','role_permissions'].forEach(t => {
  const exists = tables.some(tb => tb.name === t);
  if (!exists) console.log('TABLE MISSING: ' + t);
  else console.log('TABLE OK: ' + t);
});

// 4. Check views directories exist
const fs = require('fs');
const path = require('path');
const viewDirs = ['branches','customers','orders','reports','settings','users','media','notifications','products','departments','categories','offers','banners','pages'];
console.log('\n=== VIEW DIRECTORIES ===');
viewDirs.forEach(d => {
  const dir = path.join(__dirname, '..', 'views', 'admin', d);
  if (!fs.existsSync(dir)) {
    console.log('VIEW DIR MISSING: ' + d);
  } else {
    const files = fs.readdirSync(dir);
    console.log('VIEW DIR ' + d + ': ' + files.join(', '));
  }
});

// 5. Check products table full schema
console.log('\n=== PRODUCTS SCHEMA ===');
const prodCols = db.prepare('PRAGMA table_info(products)').all();
console.log(prodCols.map(c => c.name).join(', '));

// 6. Check offers table full schema
console.log('\n=== OFFERS SCHEMA ===');
const offerCols = db.prepare('PRAGMA table_info(offers)').all();
console.log(offerCols.map(c => c.name).join(', '));

// 7. Check banners table full schema
console.log('\n=== BANNERS SCHEMA ===');
const bannerCols = db.prepare('PRAGMA table_info(banners)').all();
console.log(bannerCols.map(c => c.name).join(', '));

// 8. Check departments table
if (tables.some(t => t.name === 'departments')) {
  console.log('\n=== DEPARTMENTS SCHEMA ===');
  const deptCols = db.prepare('PRAGMA table_info(departments)').all();
  console.log(deptCols.map(c => c.name).join(', '));
  const deptData = db.prepare('SELECT * FROM departments').all();
  console.log('DEPARTMENTS DATA: ' + deptData.length + ' rows');
  deptData.forEach(d => console.log('  ' + d.id + ': ' + d.slug + ' - ' + d.name_ar));
}

// 9. Check admin_users
console.log('\n=== ADMIN_USERS SCHEMA ===');
const adminCols = db.prepare('PRAGMA table_info(admin_users)').all();
console.log(adminCols.map(c => c.name).join(', '));

// 10. Check if sharp is available
try { require('sharp'); console.log('\nsharp: INSTALLED'); } catch(e) { console.log('\nsharp: NOT INSTALLED'); }

db.close();
