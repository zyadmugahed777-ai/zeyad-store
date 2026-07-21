const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const { setFlash, logAction } = require('../../middleware/auth');

function getRoles(db) {
  return db.prepare('SELECT * FROM roles ORDER BY id').all();
}

function normalizeUser(body, isCreate = false) {
  const payload = {
    username: (body.username || '').trim(),
    full_name: (body.full_name || '').trim(),
    email: (body.email || '').trim(),
    role_id: Number(body.role_id || 2),
    role: (body.role || 'admin').trim(),
    is_active: body.is_active === 'on' ? 1 : 0
  };
  if (!payload.username) throw new Error('اسم المستخدم مطلوب');
  if (isCreate && !body.password) throw new Error('كلمة المرور مطلوبة');
  if (body.password && body.password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  return payload;
}

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 20);
    const search = req.query.q || '';
    const roleId = req.query.role_id || '';
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (roleId) {
      where += ' AND u.role_id = ?';
      params.push(roleId);
    }

    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM admin_users u ${where}`).get(...params).count;
    const users = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role, u.role_id, u.is_active, u.last_login, u.created_at, r.name as role_name
      FROM admin_users u
      LEFT JOIN roles r ON r.id = u.role_id
      ${where}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.render('admin/users/list', {
      title: 'إدارة المستخدمين',
      active: 'users',
      users,
      roles: getRoles(db),
      search,
      roleId,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/create', (req, res) => {
  const db = getDb();
  res.render('admin/users/form', {
    title: 'إضافة مستخدم',
    active: 'users',
    user: null,
    roles: getRoles(db)
  });
});

router.post('/create', (req, res) => {
  try {
    const db = getDb();
    const user = normalizeUser(req.body, true);
    const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(user.role_id);
    user.role = role ? role.name : user.role;
    const passwordHash = bcrypt.hashSync(req.body.password, 10);

    const result = db.prepare(`
      INSERT INTO admin_users (username, password_hash, full_name, email, role, role_id, is_active)
      VALUES (@username, @password_hash, @full_name, @email, @role, @role_id, @is_active)
    `).run({ ...user, password_hash: passwordHash });

    logAction(req.session.admin.id, 'CREATE', 'admin_users', result.lastInsertRowid, user, null, req.ip);
    setFlash(req, 'success', 'تم إنشاء المستخدم');
    res.redirect('/admin/users');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, full_name, email, role, role_id, is_active FROM admin_users WHERE id = ?').get(req.params.id);
  if (!user) {
    setFlash(req, 'danger', 'المستخدم غير موجود');
    return res.redirect('/admin/users');
  }
  res.render('admin/users/form', {
    title: 'تعديل مستخدم',
    active: 'users',
    user,
    roles: getRoles(db)
  });
});

router.post('/:id/edit', (req, res) => {
  try {
    const db = getDb();
    const oldUser = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.params.id);
    if (!oldUser) throw new Error('المستخدم غير موجود');

    const user = normalizeUser(req.body, false);
    const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(user.role_id);
    user.role = role ? role.name : user.role;

    db.prepare(`
      UPDATE admin_users SET username = @username, full_name = @full_name, email = @email,
      role = @role, role_id = @role_id, is_active = @is_active, updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...user, id: req.params.id });

    if (req.body.password) {
      db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(req.body.password, 10), req.params.id);
    }

    logAction(req.session.admin.id, 'UPDATE', 'admin_users', req.params.id, user, oldUser, req.ip);
    setFlash(req, 'success', 'تم تحديث المستخدم');
    res.redirect('/admin/users');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

router.post('/:id/delete', (req, res) => {
  const db = getDb();
  if (Number(req.params.id) === Number(req.session.admin.id)) {
    setFlash(req, 'danger', 'لا يمكنك حذف حسابك الحالي');
    return res.redirect('/admin/users');
  }
  const oldUser = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(req.params.id);
  logAction(req.session.admin.id, 'DELETE', 'admin_users', req.params.id, null, oldUser, req.ip);
  setFlash(req, 'success', 'تم حذف المستخدم');
  res.redirect('/admin/users');
});

module.exports = router;
