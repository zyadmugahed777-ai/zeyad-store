const router = require('express').Router();
const { getDb } = require('../../config/database');
const { setFlash, logAction } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// List
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const branches = db.prepare('SELECT * FROM branches ORDER BY sort_order ASC').all();
    res.render('admin/branches/list', {
      title: 'الفروع',
      active: 'branches',
      branches
    });
  } catch (error) {
    next(error);
  }
});

// Create Form
router.get('/create', (req, res) => {
  res.render('admin/branches/form', {
    title: 'إضافة فرع جديد',
    active: 'branches',
    branch: null
  });
});

// Store
router.post('/create', upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const { name_ar, name_en, city, address, phone, whatsapp, google_maps, working_hours, sort_order, is_active } = req.body;
    if (!name_ar) throw new Error('اسم الفرع مطلوب');

    let imagePath = null;
    if (req.file) imagePath = '/uploads/' + req.file.filename;

    db.prepare(`
      INSERT INTO branches (name_ar, name_en, city, address, phone, whatsapp, google_maps, working_hours, image, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name_ar, name_en || null, city || null, address || null, phone || null, whatsapp || null, google_maps || null, working_hours || null, imagePath, sort_order || 0, is_active === 'on' ? 1 : 0);

    setFlash(req, 'success', 'تم إضافة الفرع بنجاح');
    res.redirect('/admin/branches');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

// Edit Form
router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
  if (!branch) {
    setFlash(req, 'danger', 'الفرع غير موجود');
    return res.redirect('/admin/branches');
  }
  res.render('admin/branches/form', {
    title: 'تعديل الفرع: ' + branch.name_ar,
    active: 'branches',
    branch
  });
});

// Update
router.post('/:id/edit', upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const old = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
    if (!old) throw new Error('الفرع غير موجود');

    const { name_ar, name_en, city, address, phone, whatsapp, google_maps, working_hours, sort_order, is_active } = req.body;
    let imagePath = old.image;
    if (req.file) imagePath = '/uploads/' + req.file.filename;

    db.prepare(`
      UPDATE branches SET name_ar=?, name_en=?, city=?, address=?, phone=?, whatsapp=?, google_maps=?, working_hours=?, image=?, sort_order=?, is_active=? WHERE id=?
    `).run(name_ar, name_en || null, city || null, address || null, phone || null, whatsapp || null, google_maps || null, working_hours || null, imagePath, sort_order || 0, is_active === 'on' ? 1 : 0, req.params.id);

    setFlash(req, 'success', 'تم تعديل الفرع بنجاح');
    res.redirect('/admin/branches');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

// Delete
router.post('/:id/delete', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM branches WHERE id = ?').run(req.params.id);
    setFlash(req, 'success', 'تم حذف الفرع');
    res.redirect('/admin/branches');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

module.exports = router;