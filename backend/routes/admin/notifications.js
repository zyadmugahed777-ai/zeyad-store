const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const { setFlash, logAction } = require('../../middleware/auth');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.q || '';
    const read = req.query.read || '';
    const type = req.query.type || '';
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (title LIKE ? OR message LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (read !== '') {
      where += ' AND is_read = ?';
      params.push(read === '1' ? 1 : 0);
    }
    if (type) {
      where += ' AND type = ?';
      params.push(type);
    }

    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM notifications ${where}`).get(...params).count;
    const notifications = db.prepare(`
      SELECT * FROM notifications
      ${where}
      ORDER BY is_read ASC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.render('admin/notifications/list', {
      title: 'إدارة الإشعارات',
      active: 'notifications',
      notifications,
      search,
      read,
      type,
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
  res.render('admin/notifications/form', {
    title: 'إنشاء إشعار',
    active: 'notifications',
    notification: null
  });
});

router.post('/create', (req, res) => {
  try {
    const db = getDb();
    const payload = {
      type: (req.body.type || 'general').trim(),
      title: (req.body.title || '').trim(),
      message: (req.body.message || '').trim(),
      reference_id: req.body.reference_id || null,
      is_read: req.body.is_read === 'on' ? 1 : 0
    };
    if (!payload.title) throw new Error('عنوان الإشعار مطلوب');

    const result = db.prepare(`
      INSERT INTO notifications (type, reference_id, title, message, is_read)
      VALUES (@type, @reference_id, @title, @message, @is_read)
    `).run(payload);

    logAction(req.session.admin.id, 'CREATE', 'notifications', result.lastInsertRowid, payload, null, req.ip);
    setFlash(req, 'success', 'تم إنشاء الإشعار');
    res.redirect('/admin/notifications');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

router.post('/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  logAction(req.session.admin.id, 'MARK_READ', 'notifications', req.params.id, null, null, req.ip);
  setFlash(req, 'success', 'تم تعليم الإشعار كمقروء');
  res.redirect('/admin/notifications');
});

router.post('/bulk', (req, res) => {
  const db = getDb();
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids].filter(Boolean);
  const action = req.body.action;
  if (!ids.length || !action) {
    setFlash(req, 'danger', 'حدد إشعارات واختر عملية');
    return res.redirect('/admin/notifications');
  }

  const placeholders = ids.map(() => '?').join(',');
  if (action === 'read') {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'unread') {
    db.prepare(`UPDATE notifications SET is_read = 0 WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'delete') {
    db.prepare(`DELETE FROM notifications WHERE id IN (${placeholders})`).run(...ids);
  }

  logAction(req.session.admin.id, `BULK_${action.toUpperCase()}`, 'notifications', ids.join(','), { ids }, null, req.ip);
  setFlash(req, 'success', 'تم تنفيذ العملية الجماعية');
  res.redirect('/admin/notifications');
});

router.post('/:id/delete', (req, res) => {
  const db = getDb();
  const oldNotification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  logAction(req.session.admin.id, 'DELETE', 'notifications', req.params.id, null, oldNotification, req.ip);
  setFlash(req, 'success', 'تم حذف الإشعار');
  res.redirect('/admin/notifications');
});

module.exports = router;
