const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');

/**
 * Middleware to require admin authentication
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  // Store original URL for redirect after login
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

/**
 * Middleware for Role Based Access Control
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.admin) return res.redirect('/admin/login');
    
    const roleId = req.session.admin.role_id;
    const db = getDb();
    const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(roleId);
    
    if (role && allowedRoles.includes(role.name)) {
      return next();
    }
    
    req.session.flash = { type: 'danger', message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة' };
    res.redirect('/admin');
  };
}

/**
 * Function to log admin actions (Audit Logs)
 */
function logAction(userId, action, entity, entityId, newValues = null, oldValues = null, ip = null) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, action, entity, entityId, 
      oldValues ? JSON.stringify(oldValues) : null, 
      newValues ? JSON.stringify(newValues) : null, 
      ip
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Login admin user
 */
function loginAdmin(username, password, req) {
  const db = getDb();
  // Fetch user and join with roles
  const admin = db.prepare(`
    SELECT u.*, r.name as role_name 
    FROM admin_users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = ? AND u.is_active = 1
  `).get(username);

  if (!admin) return null;

  const isValid = bcrypt.compareSync(password, admin.password_hash);
  if (!isValid) return null;

  // Update last login
  db.prepare('UPDATE admin_users SET last_login = datetime(\'now\') WHERE id = ?').run(admin.id);

  logAction(admin.id, 'LOGIN', 'auth', admin.id, null, null, req.ip);

  return {
    id: admin.id,
    username: admin.username,
    full_name: admin.full_name,
    email: admin.email,
    role_id: admin.role_id,
    role_name: admin.role_name
  };
}

/**
 * Create default admin user if none exists
 */
function ensureDefaultAdmin() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();

  if (count.count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const hash = bcrypt.hashSync(password, 10);

    // Assume role_id 1 is Super Admin based on update_v2.sql
    db.prepare(
      'INSERT INTO admin_users (username, password_hash, full_name, role, role_id) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hash, 'مدير النظام', 'admin', 1);

    console.log(`  Default admin created: ${username}`);
  }
}

/**
 * Set flash message in session
 */
function setFlash(req, type, message) {
  if (req.session) {
    req.session.flash = { type, message };
  }
}

module.exports = { requireAuth, requireRole, logAction, loginAdmin, ensureDefaultAdmin, setFlash };
