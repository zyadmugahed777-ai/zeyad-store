const express = require('express');
const router = express.Router();
const { getDb } = require('../../config/database');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { setFlash, logAction } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { parsePagination } = require('../../utils/helpers');
const { syncFrontend } = require('../../utils/sync-frontend');

// API: Get categories by department
router.get('/api/by-department/:id', (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT id, name_ar FROM categories WHERE department_id = ? AND is_active = 1 ORDER BY sort_order ASC').all(req.params.id);
    res.json({ success: true, data: categories });
  } catch(error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List Categories
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 10);
    const search = req.query.q || '';
    const status = req.query.status || '';
    const department_id = req.query.department_id || '';

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (c.name_ar LIKE ? OR c.name_en LIKE ? OR c.slug LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== '') {
      where += ' AND c.is_active = ?';
      params.push(status);
    }

    if (department_id) {
      where += ' AND c.department_id = ?';
      params.push(department_id);
    }

    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM categories c WHERE ${where}`).get(...params).count;
    
    const categories = db.prepare(`
      SELECT c.*, d.name_ar as department_name,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as products_count
      FROM categories c 
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE ${where} 
      ORDER BY c.department_id ASC, c.sort_order ASC 
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const departments = db.prepare('SELECT id, name_ar FROM departments ORDER BY sort_order ASC').all();

    res.render('admin/categories/list', {
      title: 'الفئات والتصنيفات',
      active: 'categories',
      categories,
      departments,
      search,
      status,
      department_id,
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
  const db = getDb();
  const departments = db.prepare('SELECT id, name_ar FROM departments ORDER BY sort_order ASC').all();
  
  res.render('admin/categories/form', {
    title: 'إضافة تصنيف جديد',
    active: 'categories',
    category: null,
    departments
  });
});

// Store
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const db = getDb();
    const { department_id, slug, name_ar, name_en, description_ar, sort_order, is_active } = req.body;
    
    if (!slug || !name_ar || !department_id) {
      throw new Error('الاسم، الرابط، والقسم مطلوبان');
    }

    const code = 'CAT-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    let imagePath = null;
    if (req.file) {
      const file = req.file;
      const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
      const webpPath = path.join(file.destination, webpFilename);
      await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      imagePath = '/uploads/media/' + webpFilename;
    }

    const result = db.prepare(`
      INSERT INTO categories (code, department_id, slug, name_ar, name_en, image, description_ar, sort_order, is_active)
      VALUES (@code, @department_id, @slug, @name_ar, @name_en, @image, @description_ar, @sort_order, @is_active)
    `).run({
      code,
      department_id,
      slug,
      name_ar,
      name_en: name_en || null,
      image: imagePath,
      description_ar: description_ar || null,
      sort_order: sort_order || 0,
      is_active: is_active === 'on' ? 1 : 0
    });

    logAction(req.session.admin.id, 'CREATE', 'categories', result.lastInsertRowid, req.body, null, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم إضافة التصنيف بنجاح');
    res.redirect('/admin/categories');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

// Edit Form
router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  
  if (!category) {
    setFlash(req, 'danger', 'التصنيف غير موجود');
    return res.redirect('/admin/categories');
  }

  const departments = db.prepare('SELECT id, name_ar FROM departments ORDER BY sort_order ASC').all();

  res.render('admin/categories/form', {
    title: 'تعديل التصنيف: ' + category.name_ar,
    active: 'categories',
    category,
    departments
  });
});

// Update
router.post('/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const oldCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    
    if (!oldCategory) throw new Error('التصنيف غير موجود');

    const { department_id, slug, name_ar, name_en, description_ar, sort_order, is_active } = req.body;

    let imagePath = oldCategory.image;
    if (req.file) {
      const file = req.file;
      const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
      const webpPath = path.join(file.destination, webpFilename);
      await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      imagePath = '/uploads/media/' + webpFilename;
    }

    db.prepare(`
      UPDATE categories 
      SET department_id = @department_id, slug = @slug, name_ar = @name_ar, name_en = @name_en, 
          image = @image, description_ar = @description_ar, sort_order = @sort_order, 
          is_active = @is_active, updated_at = datetime('now')
      WHERE id = @id
    `).run({
      id,
      department_id,
      slug,
      name_ar,
      name_en: name_en || null,
      image: imagePath,
      description_ar: description_ar || null,
      sort_order: sort_order || 0,
      is_active: is_active === 'on' ? 1 : 0
    });

    logAction(req.session.admin.id, 'UPDATE', 'categories', id, req.body, oldCategory, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم تعديل التصنيف بنجاح');
    res.redirect('/admin/categories');
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
    
    const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id).count;
    if (products > 0) throw new Error('لا يمكن حذف التصنيف لوجود منتجات مرتبطة به');

    const oldCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    
    logAction(req.session.admin.id, 'DELETE', 'categories', id, null, oldCategory, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم حذف التصنيف بنجاح');
    res.redirect('/admin/categories');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

module.exports = router;