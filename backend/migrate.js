const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'db', 'zeyad.db'));

try {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrate_departments.sql'), 'utf8');
  db.exec(sql);
  console.log('Departments table created and seeded.');
} catch (e) {
  console.error('Error running SQL file:', e.message);
}

try {
  db.exec('ALTER TABLE products ADD COLUMN department_id INTEGER;');
  console.log('Added department_id to products.');
} catch (e) {
  console.log('department_id might already exist:', e.message);
}

console.log('Migration complete.');
db.close();
