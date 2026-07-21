const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'db', 'zeyad.db'));
try {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrate_revisions.sql'), 'utf8');
  db.exec(sql);
  console.log('Revisions table created.');
} catch (e) {
  console.error(e);
}
db.close();
