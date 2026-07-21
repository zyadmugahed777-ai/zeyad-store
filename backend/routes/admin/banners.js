const router = require('express').Router();
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { parsePagination } = require('../../utils/helpers');
const { setFlash, logAction } = require('../../middleware/auth');
const { syncFrontend } = require('../../utils/sync-frontend');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function normalizeBanner(body, file) {
  if (!(body.title || '').trim()) throw new Error('عنوان البنر مطلوب');
  return {
    title: body.title.trim(),
    subtitle: (body.subtitle || '').trim(),
    body: (body.body || '').trim(),
    image: file ? `/uploads/banners/${file.filename}` : body.existing_image || '',
    desktop_image: file ? `/uploads/banners/${file.filename}` : body.existing_desktop_image || body.existing_image || '',
    mobile_image: body.mobile_image || '',
    button_text: (body.button_text || '').trim(),
    link: (body.link || '').trim(),
    position: body.position || 'home',
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    status: body.status || 'draft',
    is_active: body.status === 'active' ? 1 : 0,
    sort_order: Number(body.sort_order || 0)
  };
}

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 20);
    const search = req.query.q || '';
    const position = req.query.position || '';
    const status = req.query.status || '';
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (title LIKE ? OR subtitle LIKE ? OR link LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (position) {
      where += ' AND position = ?';
      params.push(position);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM banners ${where}`).get(...params).count;
    const banners = db.prepare(`
      SELECT * FROM banners
      ${where}
      ORDER BY position ASC, sort_order ASC, id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.render('admin/banners/list', {
      title: 'إدارة البنرات',
      active: 'banners',
      banners,
      search,
      position,
      status,
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
  res.render('admin/banners/form', {
    title: 'إضافة بنر',
    active: 'banners',
    banner: null
  });
});

router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const db = getDb();
    if (req.file) {
      const file = req.file;
      const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
      const webpPath = path.join(file.destination, webpFilename);
      await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.file.filename = webpFilename;
    }
    const banner = normalizeBanner(req.body, req.file);
    if (!banner.image) throw new Error('صورة البنر مطلوبة');

    const result = db.prepare(`
      INSERT INTO banners (
        title, subtitle, body, image, desktop_image, mobile_image, button_text, link,
        position, start_date, end_date, status, is_active, sort_order
      ) VALUES (
        @title, @subtitle, @body, @image, @desktop_image, @mobile_image, @button_text, @link,
        @position, @start_date, @end_date, @status, @is_active, @sort_order
      )
    `).run(banner);

    logAction(req.session.admin.id, 'CREATE', 'banners', result.lastInsertRowid, banner, null, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم إنشاء البنر بنجاح');
    res.redirect('/admin/banners');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!banner) {
    setFlash(req, 'danger', 'البنر غير موجود');
    return res.redirect('/admin/banners');
  }
  res.render('admin/banners/form', {
    title: 'تعديل بنر',
    active: 'banners',
    banner
  });
});

router.post('/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const db = getDb();
    const oldBanner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
    if (!oldBanner) {
      setFlash(req, 'danger', 'البنر غير موجود');
      return res.redirect('/admin/banners');
    }

    if (req.file) {
      const file = req.file;
      const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
      const webpPath = path.join(file.destination, webpFilename);
      await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.file.filename = webpFilename;
    }

    req.body.existing_image = oldBanner.image;
    req.body.existing_desktop_image = oldBanner.desktop_image;
    const banner = normalizeBanner(req.body, req.file);
    db.prepare(`
      UPDATE banners SET
        title = @title, subtitle = @subtitle, body = @body, image = @image,
        desktop_image = @desktop_image, mobile_image = @mobile_image,
        button_text = @button_text, link = @link, position = @position,
        start_date = @start_date, end_date = @end_date,
        status = @status, is_active = @is_active, sort_order = @sort_order
      WHERE id = @id
    `).run({ ...banner, id: req.params.id });

    logAction(req.session.admin.id, 'UPDATE', 'banners', req.params.id, banner, oldBanner, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم تحديث البنر بنجاح');
    res.redirect('/admin/banners');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

router.post('/bulk', (req, res) => {
  const db = getDb();
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids].filter(Boolean);
  const action = req.body.action;
  if (!ids.length || !action) {
    setFlash(req, 'danger', 'حدد بنرات واختر عملية');
    return res.redirect('/admin/banners');
  }

  const placeholders = ids.map(() => '?').join(',');
  if (action === 'delete') {
    db.prepare(`DELETE FROM banners WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'activate') {
    db.prepare(`UPDATE banners SET status = 'active', is_active = 1 WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'hide') {
    db.prepare(`UPDATE banners SET status = 'hidden', is_active = 0 WHERE id IN (${placeholders})`).run(...ids);
  }

  logAction(req.session.admin.id, `BULK_${action.toUpperCase()}`, 'banners', ids.join(','), { ids }, null, req.ip);
  syncFrontend();
  setFlash(req, 'success', 'تم تنفيذ العملية الجماعية');
  res.redirect('/admin/banners');
});

router.post('/sort', (req, res) => {
  const db = getDb();
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const update = db.prepare('UPDATE banners SET sort_order = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, index) => update.run(index + 1, id)))();
  logAction(req.session.admin.id, 'SORT', 'banners', 'bulk', { ids }, null, req.ip);
  syncFrontend();
  res.json({ success: true });
});

router.post('/:id/delete', (req, res) => {
  const db = getDb();
  const oldBanner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  logAction(req.session.admin.id, 'DELETE', 'banners', req.params.id, null, oldBanner, req.ip);
  syncFrontend();
  setFlash(req, 'success', 'تم حذف البنر');
  res.redirect('/admin/banners');
});

module.exports = router;
