const { getDb } = require('./config/database');
const fs = require('fs');

const db = getDb();

try {
  const sql = fs.readFileSync('db/update_visual_cms.sql', 'utf8');
  const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
  
  for (let stmt of statements) {
    if (!stmt || stmt.trim().length === 0) continue;
    
    if (stmt.trim().toUpperCase().startsWith('ALTER TABLE')) {
      try {
        db.prepare(stmt).run();
      } catch (e) {
        if (!e.message.includes('duplicate column name')) {
          console.error('Error executing:', stmt, e.message);
        }
      }
    } else {
      db.prepare(stmt).run();
    }
  }
  
  console.log('Visual CMS Schema Updated Successfully!');
} catch (error) {
  console.error('Migration failed:', error);
}
