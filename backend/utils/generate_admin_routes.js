const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '..', 'routes', 'admin');
if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir, { recursive: true });
}

const files = {
  'index.js': `const router = require('express').Router();
const { requireAuth, loginAdmin, ensureDefaultAdmin, setFlash } = require('../../middleware/auth');
const { formatPrice, formatDate, formatDateTime, parsePagination, paginationInfo, statusLabel, statusColor, paymentLabel } = require('../../utils/helpers');

// Ensure default admin exists
ensureDefaultAdmin();

// Make helpers available to all admin views
router.use((req, res, next) => {
  res.locals.helpers = { formatPrice, formatDate, formatDateTime, parsePagination, paginationInfo, statusLabel, statusColor, paymentLabel };
  next();
});

// Auth routes
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'تسجيل الدخول', layout: false });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = loginAdmin(username, password);
  
  if (admin) {
    req.session.admin = admin;
    const returnTo = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } else {
    setFlash(req, 'error', 'بيانات الدخول غير صحيحة');
    res.redirect('/admin/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Protect all following routes
router.use(requireAuth);

// Mount sub-routers
router.use('/', require('./dashboard'));
router.use('/products', require('./products'));
router.use('/categories', require('./categories'));
router.use('/orders', require('./orders'));
router.use('/customers', require('./customers'));
router.use('/branches', require('./branches'));
router.use('/offers', require('./offers'));
router.use('/banners', require('./banners'));
router.use('/media', require('./media'));
router.use('/notifications', require('./notifications'));
router.use('/reports', require('./reports'));
router.use('/settings', require('./settings'));
router.use('/users', require('./users'));

module.exports = router;`,

  'dashboard.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    
    // Quick stats
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      orders_today: db.prepare('SELECT COUNT(*) as c FROM orders WHERE date(created_at) = ?').get(today).c,
      pending_orders: db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = "pending"').get().c,
      total_revenue: db.prepare('SELECT SUM(total) as s FROM orders WHERE status != "cancelled"').get().s || 0,
      total_customers: db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
      unread_notifications: db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0').get().c
    };

    // Recent orders
    const recentOrders = db.prepare(\`
      SELECT o.id, o.order_id, o.total, o.status, o.created_at, c.first_name, c.last_name 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      ORDER BY o.id DESC LIMIT 10
    \`).all();

    res.render('admin/dashboard', {
      title: 'لوحة التحكم',
      active: 'dashboard',
      stats,
      recentOrders
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'products.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const upload = require('../../middleware/upload');
const { setFlash } = require('../../middleware/auth');

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
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }
    if (catId) {
      query += ' AND p.category_id = ?';
      params.push(catId);
    }

    const totalItems = db.prepare('SELECT COUNT(*) as c FROM (' + query + ')').get(...params).c;
    
    query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = db.prepare(query).all(...params);
    const categories = db.prepare('SELECT id, name_ar FROM categories').all();

    res.render('admin/products/list', {
      title: 'المنتجات',
      active: 'products',
      products,
      categories,
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

module.exports = router;`,

  'categories.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.render('admin/categories/list', {
      title: 'التصنيفات',
      active: 'categories',
      categories
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;`,

  'orders.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const { setFlash } = require('../../middleware/auth');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.q || '';
    const status = req.query.status || '';

    let query = \`
      SELECT o.*, c.first_name, c.phone 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE 1=1
    \`;
    const params = [];

    if (search) {
      query += ' AND (o.order_id LIKE ? OR c.phone LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    const totalItems = db.prepare('SELECT COUNT(*) as c FROM (' + query + ')').get(...params).c;
    
    query += ' ORDER BY o.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = db.prepare(query).all(...params);

    res.render('admin/orders/list', {
      title: 'الطلبات',
      active: 'orders',
      orders,
      search,
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

router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const order = db.prepare(\`
      SELECT o.*, c.first_name, c.last_name, c.phone, c.email 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE o.id = ?
    \`).get(req.params.id);
    
    if (!order) return res.status(404).send('الطلب غير موجود');

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(order.id);

    res.render('admin/orders/detail', {
      title: 'تفاصيل الطلب ' + order.order_id,
      active: 'orders',
      order,
      items,
      payment
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/status', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    setFlash(req, 'success', 'تم تحديث حالة الطلب بنجاح');
    res.redirect('/admin/orders/' + req.params.id);
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'customers.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.q || '';

    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (first_name LIKE ? OR phone LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }

    const totalItems = db.prepare('SELECT COUNT(*) as c FROM (' + query + ')').get(...params).c;
    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const customers = db.prepare(query).all(...params);

    res.render('admin/customers/list', {
      title: 'العملاء',
      active: 'customers',
      customers,
      search,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'branches.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

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
module.exports = router;`,

  'offers.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const offers = db.prepare('SELECT * FROM offers ORDER BY id DESC').all();
    res.render('admin/offers/list', {
      title: 'العروض',
      active: 'offers',
      offers
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;`,

  'banners.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const banners = db.prepare('SELECT * FROM banners ORDER BY position ASC, sort_order ASC').all();
    res.render('admin/banners/list', {
      title: 'البانرات',
      active: 'banners',
      banners
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;`,

  'media.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const upload = require('../../middleware/upload');
const { setFlash } = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 30);
    
    const totalItems = db.prepare('SELECT COUNT(*) as c FROM media').get().c;
    const media = db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);

    res.render('admin/media/library', {
      title: 'المكتبة',
      active: 'media',
      media,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.array('files', 10), (req, res, next) => {
  try {
    const db = getDb();
    if (req.files && req.files.length > 0) {
      const insert = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)');
      for (const f of req.files) {
        insert.run(f.filename, f.originalname, f.mimetype, f.size, '/uploads/media/' + f.filename);
      }
      setFlash(req, 'success', 'تم رفع الملفات بنجاح');
    }
    res.redirect('back');
  } catch (error) {
    next(error);
  }
});

router.post('/:id/delete', (req, res, next) => {
  try {
    const db = getDb();
    const file = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (file) {
      const fullPath = path.join(__dirname, '../../', file.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      db.prepare('DELETE FROM media WHERE id = ?').run(file.id);
      setFlash(req, 'success', 'تم حذف الملف');
    }
    res.redirect('back');
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'notifications.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    
    const totalItems = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c;
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);

    res.render('admin/notifications/list', {
      title: 'الإشعارات',
      active: 'notifications',
      notifications,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'settings.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { setFlash } = require('../../middleware/auth');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const settingsRows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    settingsRows.forEach(s => { settings[s.key] = s.value; });

    res.render('admin/settings/index', {
      title: 'الإعدادات',
      active: 'settings',
      settings
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const update = db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?');
    
    // Begin transaction
    db.transaction(() => {
      for (const [key, value] of Object.entries(req.body)) {
        update.run(value, key);
      }
    })();
    
    setFlash(req, 'success', 'تم حفظ الإعدادات بنجاح');
    res.redirect('/admin/settings');
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'users.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, username, full_name, email, role, is_active, last_login, created_at FROM admin_users').all();
    res.render('admin/users/list', {
      title: 'المستخدمين',
      active: 'users',
      users
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;`,

  'reports.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    
    // Status breakdown
    const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all();
    
    // Top products
    const topProducts = db.prepare(\`
      SELECT product_title, SUM(quantity) as qty, SUM(total) as revenue 
      FROM order_items 
      GROUP BY product_id 
      ORDER BY qty DESC LIMIT 10
    \`).all();

    res.render('admin/reports/index', {
      title: 'التقارير',
      active: 'reports',
      statusCounts,
      topProducts
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(adminDir, filename), content);
  console.log('Created admin route: ' + filename);
}
console.log('All Admin routes created successfully.');
