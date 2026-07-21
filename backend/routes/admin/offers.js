const router = require('express').Router();
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { parsePagination } = require('../../utils/helpers');
const { setFlash, logAction } = require('../../middleware/auth');
const { syncFrontend } = require('../../utils/sync-frontend');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function listOptions(db) {
  const departments = db.prepare("SELECT id, name_ar FROM departments ORDER BY sort_order, id").all();
  const categories = db.prepare("SELECT id, name_ar FROM categories ORDER BY sort_order, id").all();
  const products = db.prepare("SELECT id, title FROM products ORDER BY id DESC LIMIT 300").all();
  return { departments, categories, products };
}

function normalizeOffer(body, file) {
  const title = (body.title_ar || '').trim();
  if (!title) throw new Error('عنوان العرض مطلوب');

  const discountValue = Number(body.discount_value || 0);
  const discountAmount = Number(body.discount_amount || 0);
  if (discountValue < 0 || discountAmount < 0) throw new Error('قيمة الخصم غير صحيحة');

  return {
    title_ar: title,
    title_en: (body.title_en || '').trim(),
    description: (body.description || '').trim(),
    image: file ? `/uploads/offers/${file.filename}` : body.existing_image || null,
    button_text: (body.button_text || '').trim(),
    link: (body.link || '').trim(),
    coupon_code: (body.coupon_code || '').trim().toUpperCase(),
    discount_type: body.discount_type || 'percentage',
    discount_value: discountValue,
    discount_amount: discountAmount,
    min_order: body.min_order ? Number(body.min_order) : null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    department_id: body.department_id || null,
    category_id: body.category_id || null,
    product_id_ref: body.product_id_ref || null,
    placement: Array.isArray(body.placement) ? body.placement.join(',') : (body.placement || 'home'),
    status: body.status || 'draft',
    is_active: body.status === 'active' ? 1 : 0,
    sort_order: Number(body.sort_order || 0),
    applicable_categories: body.category_id || '',
    applicable_products: body.product_id_ref || ''
  };
}

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 20);
    const search = req.query.q || '';
    const status = req.query.status || '';
    const placement = req.query.placement || '';
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (o.title_ar LIKE ? OR o.coupon_code LIKE ? OR o.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where += ' AND o.status = ?';
      params.push(status);
    }
    if (placement) {
      where += ' AND o.placement LIKE ?';
      params.push(`%${placement}%`);
    }

    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM offers o ${where}`).get(...params).count;
    const offers = db.prepare(`
      SELECT o.*, d.name_ar as department_name, c.name_ar as category_name, p.title as product_title
      FROM offers o
      LEFT JOIN departments d ON d.id = o.department_id
      LEFT JOIN categories c ON c.id = o.category_id
      LEFT JOIN products p ON p.id = o.product_id_ref
      ${where}
      ORDER BY o.sort_order ASC, o.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.render('admin/offers/list', {
      title: 'إدارة العروض',
      active: 'offers',
      offers,
      search,
      status,
      placement,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/create', (req, res, next) => {
  try {
    const db = getDb();
    res.render('admin/offers/form', {
      title: 'إضافة عرض',
      active: 'offers',
      offer: null,
      ...listOptions(db)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/create', upload.single('image'), async (req, res, next) => {
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
    const offer = normalizeOffer(req.body, req.file);
    const result = db.prepare(`
      INSERT INTO offers (
        title_ar, title_en, description, image, button_text, link, coupon_code,
        discount_type, discount_value, discount_amount, min_order, start_date, end_date,
        applicable_categories, applicable_products, department_id, category_id, product_id_ref,
        placement, status, is_active, sort_order
      ) VALUES (
        @title_ar, @title_en, @description, @image, @button_text, @link, @coupon_code,
        @discount_type, @discount_value, @discount_amount, @min_order, @start_date, @end_date,
        @applicable_categories, @applicable_products, @department_id, @category_id, @product_id_ref,
        @placement, @status, @is_active, @sort_order
      )
    `).run(offer);

    logAction(req.session.admin.id, 'CREATE', 'offers', result.lastInsertRowid, offer, null, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم إنشاء العرض بنجاح');
    res.redirect('/admin/offers');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('back');
  }
});

router.get('/:id/edit', (req, res, next) => {
  try {
    const db = getDb();
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) {
      setFlash(req, 'danger', 'العرض غير موجود');
      return res.redirect('/admin/offers');
    }
    res.render('admin/offers/form', {
      title: 'تعديل عرض',
      active: 'offers',
      offer,
      ...listOptions(db)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const db = getDb();
    const oldOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!oldOffer) {
      setFlash(req, 'danger', 'العرض غير موجود');
      return res.redirect('/admin/offers');
    }

    if (req.file) {
      const file = req.file;
      const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
      const webpPath = path.join(file.destination, webpFilename);
      await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.file.filename = webpFilename;
    }

    req.body.existing_image = oldOffer.image;
    const offer = normalizeOffer(req.body, req.file);
    db.prepare(`
      UPDATE offers SET
        title_ar = @title_ar, title_en = @title_en, description = @description, image = @image,
        button_text = @button_text, link = @link, coupon_code = @coupon_code,
        discount_type = @discount_type, discount_value = @discount_value, discount_amount = @discount_amount,
        min_order = @min_order, start_date = @start_date, end_date = @end_date,
        applicable_categories = @applicable_categories, applicable_products = @applicable_products,
        department_id = @department_id, category_id = @category_id, product_id_ref = @product_id_ref,
        placement = @placement, status = @status, is_active = @is_active, sort_order = @sort_order,
        updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...offer, id: req.params.id });

    logAction(req.session.admin.id, 'UPDATE', 'offers', req.params.id, offer, oldOffer, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم تحديث العرض بنجاح');
    res.redirect('/admin/offers');
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
    setFlash(req, 'danger', 'حدد عروضاً واختر عملية');
    return res.redirect('/admin/offers');
  }

  const placeholders = ids.map(() => '?').join(',');
  if (action === 'delete') {
    db.prepare(`DELETE FROM offers WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'activate') {
    db.prepare(`UPDATE offers SET status = 'active', is_active = 1 WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'hide') {
    db.prepare(`UPDATE offers SET status = 'hidden', is_active = 0 WHERE id IN (${placeholders})`).run(...ids);
  }

  logAction(req.session.admin.id, `BULK_${action.toUpperCase()}`, 'offers', ids.join(','), { ids }, null, req.ip);
  syncFrontend();
  setFlash(req, 'success', 'تم تنفيذ العملية الجماعية');
  res.redirect('/admin/offers');
});

router.post('/sort', (req, res) => {
  const db = getDb();
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const update = db.prepare('UPDATE offers SET sort_order = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, index) => update.run(index + 1, id)))();
  logAction(req.session.admin.id, 'SORT', 'offers', 'bulk', { ids }, null, req.ip);
  syncFrontend();
  res.json({ success: true });
});

router.post('/:id/delete', (req, res) => {
  const db = getDb();
  const oldOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
  logAction(req.session.admin.id, 'DELETE', 'offers', req.params.id, null, oldOffer, req.ip);
  syncFrontend();
  setFlash(req, 'success', 'تم حذف العرض');
  res.redirect('/admin/offers');
});

module.exports = router;
