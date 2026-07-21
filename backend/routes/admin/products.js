const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const upload = require('../../middleware/upload');
const { setFlash, requireAuth } = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { syncFrontend } = require('../../utils/sync-frontend');

router.use(requireAuth);

// List Products
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.q || '';
    const catId = req.query.category || '';

    let query = 'SELECT p.*, c.name_ar as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (p.title LIKE ? OR p.product_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (catId) {
      query += ' AND p.category_id = ?';
      params.push(catId);
    }
    const deptId = req.query.department || '';
    if (deptId) {
      query += ' AND p.department_id = ?';
      params.push(deptId);
    }

    const totalItems = db.prepare('SELECT COUNT(*) as c FROM (' + query + ')').get(...params).c;
    
    query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = db.prepare(query).all(...params);
    const categories = db.prepare('SELECT id, name_ar FROM categories').all();
    const departments = db.prepare('SELECT id, name_ar FROM departments').all();

    res.render('admin/products/list', {
      title: 'المنتجات',
      active: 'products',
      products,
      categories,
      departments,
      search,
      catId,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Create Form
router.get('/create', (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT id, name_ar FROM categories ORDER BY sort_order').all();
  const departments = db.prepare('SELECT id, name_ar FROM departments').all();
  res.render('admin/products/form', { 
    title: 'إضافة منتج جديد', 
    active: 'products',
    categories,
    departments,
    product: null
  });
});

// Handle Create (with Sharp image compression)
router.post('/create', upload.array('images', 10), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;
    
    const insert = db.prepare(`
      INSERT INTO products (
        product_id, category_id, department_id, title, description, short_description, price, old_price, 
        sku, barcode, tags, brand, origin, warranty, shipping, delivery_time, 
        installation, weight, video, is_new, is_best_seller, is_active, stock_status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    let newProductId;
    db.transaction(() => {
      const result = insert.run(
        body.product_id || `P-${Date.now()}`,
        body.category_id || null,
        body.department_id || null,
        body.title,
        body.description || '',
        body.short_description || '',
        body.price || 0,
        body.old_price || null,
        body.sku || '',
        body.barcode || '',
        body.tags || '',
        body.brand || '',
        body.origin || '',
        body.warranty || '',
        body.shipping || '',
        body.delivery_time || '',
        body.installation === 'on' ? 1 : 0,
        body.weight || null,
        body.video || '',
        body.is_new === 'on' ? 1 : 0,
        body.is_best_seller === 'on' ? 1 : 0,
        body.is_active === 'on' ? 1 : 0,
        body.stock_status || 'in_stock'
      );
      newProductId = result.lastInsertRowid;
    })();

    // Process Images
    if (req.files && req.files.length > 0) {
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_path, sort_order, is_primary) VALUES (?, ?, ?, ?)');
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        if (file.mimetype.startsWith('image/')) {
          const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
          const webpPath = path.join(file.destination, webpFilename);
          
          await sharp(file.path)
            .webp({ quality: 85 })
            .toFile(webpPath);
            
          fs.unlinkSync(file.path); // Remove original
          
          const relativePath = '/uploads/products/' + webpFilename;
          insertImg.run(newProductId, relativePath, i, i === 0 ? 1 : 0);
        }
      }
    }

    syncFrontend();
    setFlash(req, 'success', 'تمت إضافة المنتج بنجاح');
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    setFlash(req, 'danger', 'حدث خطأ: ' + error.message);
    res.redirect('back');
  }
});

// Edit Form
router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  
  if (!product) {
    req.session.flash = { type: 'danger', message: 'المنتج غير موجود' };
    return res.redirect('/admin/products');
  }

  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(product.id);
  const specs = db.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order').all(product.id);
  const faq = db.prepare('SELECT * FROM product_faq WHERE product_id = ? ORDER BY sort_order').all(product.id);
  const colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ?').all(product.id);
  const categories = db.prepare('SELECT id, name_ar FROM categories ORDER BY sort_order').all();
  const departments = db.prepare('SELECT id, name_ar FROM departments').all();

  res.render('admin/products/form', { 
    title: 'تعديل المنتج', 
    active: 'products',
    product,
    images,
    specs,
    faq,
    colors,
    categories,
    departments
  });
});

// Handle Edit
router.post('/:id/edit', upload.array('images', 10), async (req, res) => {
  try {
    const { 
      title, description, short_description, price, old_price, product_id, sku, barcode, tags, brand, origin, 
      warranty, shipping, delivery_time, installation, weight, video, 
      category_id, department_id, is_new, is_best_seller, is_active, stock_status 
    } = req.body;

    const db = getDb();
    
    db.prepare(`
      UPDATE products SET 
        product_id = ?, category_id = ?, department_id = ?, title = ?, description = ?, short_description = ?, price = ?, old_price = ?,
        sku = ?, barcode = ?, tags = ?, brand = ?, origin = ?, warranty = ?, shipping = ?, delivery_time = ?,
        installation = ?, weight = ?, video = ?, is_new = ?, is_best_seller = ?, is_active = ?, stock_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      product_id || '', category_id || null, department_id || null, title, description || '', short_description || '', price || 0, old_price || null,
      sku || '', barcode || '', tags || '', brand || '', origin || '', warranty || '', shipping || '', delivery_time || '',
      installation || '', weight || '', video || '', is_new ? 1 : 0, is_best_seller ? 1 : 0, is_active ? 1 : 0, stock_status || 'in_stock',
      req.params.id
    );

    // Add new images
    if (req.files && req.files.length > 0) {
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_path, sort_order, is_primary) VALUES (?, ?, ?, ?)');
      const currentImagesCount = db.prepare('SELECT COUNT(*) as c FROM product_images WHERE product_id = ?').get(req.params.id).c;
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        if (file.mimetype.startsWith('image/')) {
          const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
          const webpPath = path.join(file.destination, webpFilename);
          await sharp(file.path).webp({ quality: 85 }).toFile(webpPath);
          fs.unlinkSync(file.path);
          insertImg.run(req.params.id, '/uploads/products/' + webpFilename, currentImagesCount + i, (currentImagesCount + i) === 0 ? 1 : 0);
        }
      }
    }

    // Process image deletions if any
    if (req.body.delete_images) {
      let idsToDelete = Array.isArray(req.body.delete_images) ? req.body.delete_images : [req.body.delete_images];
      const stmt = db.prepare('SELECT path FROM product_images WHERE id = ?');
      const delStmt = db.prepare('DELETE FROM product_images WHERE id = ?');
      for (const imgId of idsToDelete) {
        const img = stmt.get(imgId);
        if (img) {
          const fsPath = path.join(__dirname, '..', '..', img.path.replace(/^\//, ''));
          if (fs.existsSync(fsPath)) fs.unlinkSync(fsPath);
          delStmt.run(imgId);
        }
      }
    }

    syncFrontend();
    setFlash(req, 'success', 'تم تحديث المنتج بنجاح');
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    setFlash(req, 'danger', 'حدث خطأ: ' + error.message);
    res.redirect('back');
  }
});

// Duplicate Product
router.post('/:id/duplicate', (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    
    // Get original
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.redirect('/admin/products');

    // Create copy
    const newProductId = 'P-COPY-' + Date.now();
    const insert = db.prepare(`
      INSERT INTO products (
        product_id, category_id, department_id, title, description, short_description, price, old_price, 
        sku, barcode, tags, brand, origin, warranty, shipping, delivery_time, 
        installation, weight, video, is_new, is_best_seller, is_active, stock_status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const result = insert.run(
      newProductId, product.category_id, product.department_id, product.title + ' (نسخة)', product.description, 
      product.short_description, product.price, product.old_price, '', '', product.tags, product.brand, 
      product.origin, product.warranty, product.shipping, product.delivery_time, product.installation, 
      product.weight, product.video, 0, 0, 0, product.stock_status // Default is_active=0 for copies
    );

    const newId = result.lastInsertRowid;

    // Copy Images
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(id);
    const insertImg = db.prepare('INSERT INTO product_images (product_id, image_path, sort_order, is_primary) VALUES (?, ?, ?, ?)');
    for (let img of images) {
      insertImg.run(newId, img.image_path, img.sort_order, img.is_primary);
    }

    syncFrontend();
    req.session.flash = { type: 'success', message: 'تم نسخ المنتج بنجاح كمسودة' };
    res.redirect('/admin/products/' + newId + '/edit');
  } catch (e) {
    req.session.flash = { type: 'danger', message: e.message };
    res.redirect('/admin/products');
  }
});

// Delete Product
router.post('/:id/delete', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  syncFrontend();
  setFlash(req, 'success', 'تم حذف المنتج');
  res.redirect('/admin/products');
});

module.exports = router;