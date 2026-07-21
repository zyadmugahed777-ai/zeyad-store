const fs = require('fs');
const path = require('path');
const { getDb } = require('./config/database');

function runUpdate() {
  console.log('Starting Database Update V2...');
  const db = getDb();
  
  // 1. Run the SQL script
  const sqlPath = path.join(__dirname, 'db', 'update_v2.sql');
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    db.exec(sql);
    console.log('Schema V2 tables created.');
  }

  // 2. Safe ALTER TABLES
  const alterStatements = [
    { table: 'admin_users', column: 'role_id', def: 'INTEGER REFERENCES roles(id) DEFAULT 2' },
    { table: 'products', column: 'barcode', def: 'TEXT' },
    { table: 'products', column: 'short_description', def: 'TEXT' },
    { table: 'products', column: 'tags', def: 'TEXT' },
    { table: 'products', column: 'keywords', def: 'TEXT' },
    { table: 'media', column: 'folder', def: 'TEXT DEFAULT "general"' },
  ];

  for (const alt of alterStatements) {
    try {
      db.prepare(`ALTER TABLE ${alt.table} ADD COLUMN ${alt.column} ${alt.def}`).run();
      console.log(`Added column ${alt.column} to ${alt.table}`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        // Ignore duplicate column errors
      } else {
        console.error(`Error adding ${alt.column} to ${alt.table}:`, e.message);
      }
    }
  }

  // 3. Ensure super admin has role_id = 1
  try {
    db.prepare("UPDATE admin_users SET role_id = 1 WHERE username = 'admin'").run();
  } catch (e) {}

  console.log('Database Update V2 Completed.');
}

runUpdate();
