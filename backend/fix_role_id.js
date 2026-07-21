const fs = require('fs');
const { getDb } = require('./config/database');

const db = getDb();
try {
  db.prepare('ALTER TABLE admin_users ADD COLUMN role_id INTEGER REFERENCES roles(id)').run();
  console.log('Added role_id to admin_users');
} catch (e) {
  if (!e.message.includes('duplicate column')) console.log(e.message);
}

try {
  db.prepare('UPDATE admin_users SET role_id = 1 WHERE role_id IS NULL').run();
  console.log('Updated existing users to Super Admin');
} catch (e) {
  console.log(e.message);
}
