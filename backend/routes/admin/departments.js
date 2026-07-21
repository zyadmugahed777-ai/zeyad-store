const express = require('express');
const router = express.Router();
const { getDb } = require('../../config/database');
const { setFlash, logAction } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { parsePagination } = require('../../utils/helpers');

// List Departments
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 10);
    const search = req.query.q || '';
    const status = req.query.status || '';

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (name_ar LIKE ? OR name_en LIKE ? OR slug LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== '') {
      where += ' AND is_active = ?';
      params.push(status);
    }

    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM departments WHERE ${where}`).get(...params).count;
    
    // Get departments with their subcategories and products count
    const departments = db.prepare(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM subcategories s WHERE s.department_id = d.id) as subcats_count,
             (SELECT COUNT(*) FROM products p WHERE p.department_id = d.id) as products_count
      FROM departments d 
      WHERE ${where} 
      ORDER BY d.sort_order ASC 
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.render('admin/departments/list', {
      title: 'الأقسام الرئيسية (Departments)',
      active: 'departments',
      departments,
      search,
      status,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('/admin');
  }
});

// Create Form
router.get('/create', (req, res) => {
  res.render('admin/departments/form', {
    title: 'إضافة قسم رئيسي',
    active: 'departments',
    department: null
  });
});

// Store
router.post('/create', upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const { slug, name_ar, name_en, icon, description_ar, description_en, sort_order, is_active } = req.body;
    
    if (!slug || !name_ar) {
      throw new Error('الاسم العربي والـ Slug مطلوبان');
    }

    let imagePath = null;
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }

    const result = db.prepare(`
      INSERT INTO departments (slug, name_ar, name_en, icon, image, description_ar, description_en, sort_order, is_active)
      VALUES (@slug, @name_ar, @name_en, @icon, @image, @description_ar, @description_en, @sort_order, @is_active)
    `).run({
      slug,
      name_ar,
      name_en: name_en || null,
      icon: icon || null,
      image: imagePath,
      description_ar: description_ar || null,
      description_en: description_en || null,
      sort_order: sort_order || 0,
      is_active: is_active === 'on' ? 1 : 0
    });

    logAction(req.session.admin.id, 'CREATE', 'departments', result.lastInsertRowid, req.body, null, req.ip);
    setFlash(req, 'success', 'تم إضافة القسم بنجاح');
    res.redirect('/admin/departments');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

// Edit Form
router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const department = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  
  if (!department) {
    setFlash(req, 'danger', 'القسم غير موجود');
    return res.redirect('/admin/departments');
  }

  res.render('admin/departments/form', {
    title: 'تعديل القسم: ' + department.name_ar,
    active: 'departments',
    department
  });
});

// Update
router.post('/:id/edit', upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const oldDepartment = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    
    if (!oldDepartment) throw new Error('القسم غير موجود');

    const { slug, name_ar, name_en, icon, description_ar, description_en, sort_order, is_active } = req.body;

    let imagePath = oldDepartment.image;
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }

    db.prepare(`
      UPDATE departments 
      SET slug = @slug, name_ar = @name_ar, name_en = @name_en, icon = @icon, image = @image,
          description_ar = @description_ar, description_en = @description_en, sort_order = @sort_order, 
          is_active = @is_active, updated_at = datetime('now')
      WHERE id = @id
    `).run({
      id,
      slug,
      name_ar,
      name_en: name_en || null,
      icon: icon || null,
      image: imagePath,
      description_ar: description_ar || null,
      description_en: description_en || null,
      sort_order: sort_order || 0,
      is_active: is_active === 'on' ? 1 : 0
    });

    logAction(req.session.admin.id, 'UPDATE', 'departments', id, req.body, oldDepartment, req.ip);
    setFlash(req, 'success', 'تم تعديل القسم بنجاح');
    res.redirect('/admin/departments');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

// Delete
router.post('/:id/delete', (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    
    // Check if there are subcategories or products
    const subcats = db.prepare('SELECT COUNT(*) as count FROM subcategories WHERE department_id = ?').get(id).count;
    if (subcats > 0) throw new Error('لا يمكن حذف القسم لوجود فئات فرعية مرتبطة به');
    
    const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE department_id = ?').get(id).count;
    if (products > 0) throw new Error('لا يمكن حذف القسم لوجود منتجات مرتبطة به');

    const oldDepartment = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    
    logAction(req.session.admin.id, 'DELETE', 'departments', id, null, oldDepartment, req.ip);
    setFlash(req, 'success', 'تم حذف القسم بنجاح');
    res.redirect('/admin/departments');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

module.exports = router;
