const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'routes', 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

const files = {
  'products.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination, paginationInfo } = require('../../utils/helpers');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const { category, search, min_price, max_price, sort } = req.query;

    let query = 'SELECT p.*, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1';
    const params = [];

    if (category) {
      const cat = db.prepare('SELECT id FROM categories WHERE code = ? OR slug = ?').get(category, category);
      if (cat) {
        query += ' AND p.category_id = ?';
        params.push(cat.id);
      }
    }
    if (search) {
      query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`);
    }
    if (min_price) {
      query += ' AND p.price >= ?';
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      query += ' AND p.price <= ?';
      params.push(parseFloat(max_price));
    }

    let sortQuery = ' ORDER BY p.sort_order ASC, p.id DESC';
    if (sort === 'price_asc') sortQuery = ' ORDER BY p.price ASC';
    if (sort === 'price_desc') sortQuery = ' ORDER BY p.price DESC';
    if (sort === 'newest') sortQuery = ' ORDER BY p.id DESC';
    if (sort === 'popular') sortQuery = ' ORDER BY p.is_best_seller DESC, p.reviews_count DESC';
    
    query += sortQuery;

    const countQuery = 'SELECT COUNT(*) as total FROM (' + query + ')';
    const totalItems = db.prepare(countQuery).get(...params).total;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: products,
      pagination: paginationInfo(page, limit, totalItems)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const product = db.prepare('SELECT p.*, c.name_ar as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.product_id = ? AND p.is_active = 1').get(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }

    product.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
    product.specs = db.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    product.faq = db.prepare('SELECT * FROM product_faq WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    product.colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ?').all(product.id);

    res.json({ success: true, data: product });
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
    const categories = db.prepare(\`
      SELECT c.*, 
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c 
      WHERE c.is_active = 1 
      ORDER BY c.sort_order ASC
    \`).all();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', (req, res, next) => {
  try {
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').get(req.params.slug);
    if (!category) {
      return res.status(404).json({ success: false, error: 'التصنيف غير موجود' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'orders.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { generateOrderId } = require('../../utils/order-number');
const { formatOrderForWhatsApp } = require('../../utils/whatsapp-prep');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { customer, items, paymentMethod, deliveryMethod, notes } = req.body;

    if (!customer || !customer.firstName || !customer.phone) {
      return res.status(400).json({ success: false, error: 'بيانات العميل (الاسم ورقم الهاتف) مطلوبة' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'الطلب يجب أن يحتوي على منتج واحد على الأقل' });
    }

    const phone = normalizePhone(customer.phone);
    
    // Process in a transaction
    const processOrder = db.transaction(() => {
      // 1. Find or create customer
      let customerRecord = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
      let customerId;
      
      if (customerRecord) {
        customerId = customerRecord.id;
        db.prepare(\`
          UPDATE customers 
          SET first_name = ?, last_name = ?, email = ?, city = ?, district = ?, address_detail = ?
          WHERE id = ?
        \`).run(
          customer.firstName, customer.lastName || customerRecord.last_name, 
          customer.email || customerRecord.email, customer.city || customerRecord.city,
          customer.district || customerRecord.district, customer.addressDetail || customerRecord.address_detail,
          customerId
        );
      } else {
        const result = db.prepare(\`
          INSERT INTO customers (first_name, last_name, phone, email, city, district, address_detail)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        \`).run(
          customer.firstName, customer.lastName || '', phone, customer.email || '',
          customer.city || '', customer.district || '', customer.addressDetail || ''
        );
        customerId = result.lastInsertRowid;
        customerRecord = { id: customerId, first_name: customer.firstName, phone: phone };
      }

      // 2. Calculate totals and verify items
      let subtotal = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        if (!item.id || !item.quantity || item.quantity < 1) continue;
        const product = db.prepare('SELECT * FROM products WHERE product_id = ? OR id = ?').get(item.id, item.id);
        if (product) {
          const itemTotal = product.price * item.quantity;
          subtotal += itemTotal;
          orderItemsData.push({
            product_id: product.product_id,
            product_title: product.title,
            quantity: item.quantity,
            price: product.price,
            total: itemTotal
          });
        }
      }

      if (orderItemsData.length === 0) {
        throw new Error('لم يتم العثور على المنتجات المطلوبة');
      }

      const shippingFee = deliveryMethod && deliveryMethod.includes('سريع') ? 500 : 0; // Simple logic
      const total = subtotal + shippingFee;

      // 3. Create Order
      const orderIdStr = generateOrderId();
      const orderResult = db.prepare(\`
        INSERT INTO orders (
          order_id, customer_id, status, subtotal, shipping_fee, total,
          payment_method, delivery_method, city, district, address_detail, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`).run(
        orderIdStr, customerId, 'pending', subtotal, shippingFee, total,
        paymentMethod || 'cash-on-delivery', deliveryMethod || '',
        customer.city || '', customer.district || '', customer.addressDetail || '', sanitize(notes)
      );
      const orderDbId = orderResult.lastInsertRowid;

      // 4. Create Order Items
      const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_title, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)');
      for (const oi of orderItemsData) {
        insertItem.run(orderDbId, oi.product_id, oi.product_title, oi.quantity, oi.price, oi.total);
      }

      // 5. Record Payment method (just recording, not processing)
      db.prepare('INSERT INTO payments (order_id, method, amount, status) VALUES (?, ?, ?, ?)').run(
        orderDbId, paymentMethod || 'cash-on-delivery', total, 'pending'
      );

      // 6. Update customer totals
      db.prepare('UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?').run(total, customerId);

      // 7. Prepare WhatsApp Message
      const fullOrder = {
        order_id: orderIdStr, created_at: new Date().toISOString(),
        customer_name: \`\${customer.firstName} \${customer.lastName || ''}\`.trim(),
        customer_phone: phone, city: customer.city, district: customer.district, address_detail: customer.addressDetail,
        items: orderItemsData, subtotal, discount: 0, shipping_fee: shippingFee, total,
        payment_method: paymentMethod, delivery_method: deliveryMethod, notes: sanitize(notes)
      };
      
      const whatsappMsg = formatOrderForWhatsApp(fullOrder);
      db.prepare('UPDATE orders SET whatsapp_message = ? WHERE id = ?').run(whatsappMsg, orderDbId);

      // 8. Create Notification for Admin
      db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
        'order', orderDbId, 'طلب جديد', \`طلب جديد رقم \${orderIdStr} بقيمة \${total} ر.ي\`
      );

      return orderIdStr;
    });

    const finalOrderId = processOrder();
    res.json({ success: true, data: { orderId: finalOrderId, status: 'pending' } });

  } catch (error) {
    if (error.message === 'لم يتم العثور على المنتجات المطلوبة') {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
});

router.get('/track/:phone', (req, res, next) => {
  try {
    const db = getDb();
    const phone = normalizePhone(req.params.phone);
    
    const customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (!customer) {
      return res.json({ success: true, data: [] });
    }

    const orders = db.prepare('SELECT order_id, status, total, created_at FROM orders WHERE customer_id = ? ORDER BY id DESC').all(customer.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'appointments.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, branch, date, time, visitType, city, notes } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    const result = db.prepare(\`
      INSERT INTO appointments (full_name, phone, branch, date, time, visit_type, city, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(sanitize(fullName), normalizePhone(phone), sanitize(branch), sanitize(date), sanitize(time), sanitize(visitType), sanitize(city), sanitize(notes));

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'appointment', result.lastInsertRowid, 'حجز موعد جديد', \`موعد جديد: \${sanitize(fullName)}\`
    );

    res.json({ success: true, message: 'تم حجز الموعد بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'consultations.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');
const upload = require('../../middleware/upload');

router.post('/', upload.array('attachments', 5), (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, consultationType, details, city, contactMethod } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    let attachmentsStr = '';
    if (req.files && req.files.length > 0) {
      const paths = req.files.map(f => '/uploads/consultations/' + f.filename);
      attachmentsStr = JSON.stringify(paths);
      
      const insertMedia = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)');
      for (const f of req.files) {
        insertMedia.run(f.filename, f.originalname, f.mimetype, f.size, '/uploads/consultations/' + f.filename);
      }
    }

    const result = db.prepare(\`
      INSERT INTO consultations (full_name, phone, consultation_type, details, city, contact_method, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).run(sanitize(fullName), normalizePhone(phone), sanitize(consultationType), sanitize(details), sanitize(city), sanitize(contactMethod), attachmentsStr);

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'consultation', result.lastInsertRowid, 'طلب استشارة جديد', \`طلب استشارة من: \${sanitize(fullName)}\`
    );

    res.json({ success: true, message: 'تم إرسال طلب الاستشارة بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'designs.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, designType, dimensions, budget, stylePref, details } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    const result = db.prepare(\`
      INSERT INTO design_requests (full_name, phone, design_type, dimensions, budget, style_pref, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).run(sanitize(fullName), normalizePhone(phone), sanitize(designType), sanitize(dimensions), sanitize(budget), sanitize(stylePref), sanitize(details));

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'design', result.lastInsertRowid, 'طلب تصميم جديد', \`طلب تصميم (\${sanitize(designType)}) من: \${sanitize(fullName)}\`
    );

    res.json({ success: true, message: 'تم إرسال طلب التصميم بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'quotes.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');
const upload = require('../../middleware/upload');

router.post('/', upload.single('boqFile'), (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, companyName, email, projectType, productsDetails } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    let boqPath = '';
    if (req.file) {
      boqPath = '/uploads/quotes/' + req.file.filename;
      db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)').run(
        req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, boqPath
      );
    }

    const result = db.prepare(\`
      INSERT INTO quote_requests (full_name, phone, company_name, email, project_type, products_details, boq_file)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).run(sanitize(fullName), normalizePhone(phone), sanitize(companyName), sanitize(email), sanitize(projectType), sanitize(productsDetails), boqPath);

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'quote', result.lastInsertRowid, 'طلب تسعير جديد', \`طلب تسعير \${companyName ? 'من شركة ' + sanitize(companyName) : 'من ' + sanitize(fullName)}\`
    );

    res.json({ success: true, message: 'تم إرسال طلب عرض السعر بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'contact.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, email, subject, message } = req.body;

    if (!fullName || !message) {
      return res.status(400).json({ success: false, error: 'الاسم والرسالة مطلوبان' });
    }

    const result = db.prepare(\`
      INSERT INTO contact_messages (full_name, phone, email, subject, message)
      VALUES (?, ?, ?, ?, ?)
    \`).run(sanitize(fullName), normalizePhone(phone), sanitize(email), sanitize(subject), sanitize(message));

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'contact', result.lastInsertRowid, 'رسالة تواصل جديدة', \`رسالة جديدة من: \${sanitize(fullName)}\`
    );

    res.json({ success: true, message: 'تم إرسال الرسالة بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'newsletter.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { email } = req.body;

    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'بريد إلكتروني غير صالح' });
    }

    try {
      db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
    } catch (e) {
      // Ignore unique constraint error
      if (!e.message.includes('UNIQUE constraint failed')) throw e;
    }

    res.json({ success: true, message: 'تم الاشتراك في النشرة البريدية بنجاح' });
  } catch (error) {
    next(error);
  }
});

router.delete('/', (req, res, next) => {
  try {
    const db = getDb();
    const { email } = req.body;
    if (email) {
      db.prepare('DELETE FROM newsletter WHERE email = ?').run(email);
    }
    res.json({ success: true, message: 'تم إلغاء الاشتراك' });
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
    const branches = db.prepare('SELECT * FROM branches WHERE is_active = 1 ORDER BY sort_order ASC').all();
    res.json({ success: true, data: branches });
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
    const now = new Date().toISOString();
    const offers = db.prepare(\`
      SELECT * FROM offers 
      WHERE is_active = 1 
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
    \`).all(now, now);
    res.json({ success: true, data: offers });
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
    const position = req.query.position || 'home';
    const now = new Date().toISOString();
    const banners = db.prepare(\`
      SELECT * FROM banners 
      WHERE is_active = 1 
      AND position = ?
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      ORDER BY sort_order ASC
    \`).all(position, now, now);
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'media.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { parsePagination, paginationInfo } = require('../../utils/helpers');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    
    const totalItems = db.prepare('SELECT COUNT(*) as total FROM media').get().total;
    const media = db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);

    res.json({ 
      success: true, 
      data: media,
      pagination: paginationInfo(page, limit, totalItems)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.array('files', 10), (req, res, next) => {
  try {
    const db = getDb();
    const results = [];
    
    if (req.files && req.files.length > 0) {
      const insert = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)');
      for (const f of req.files) {
        const filePath = '/uploads/media/' + f.filename; // Assuming default subfolder
        const info = insert.run(f.filename, f.originalname, f.mimetype, f.size, filePath);
        results.push({
          id: info.lastInsertRowid,
          filename: f.filename,
          original_name: f.originalname,
          url: filePath
        });
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'settings.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    // Return only safe public settings
    const settings = db.prepare(\`
      SELECT key, value, type FROM settings 
      WHERE group_name IN ('general', 'delivery', 'payment', 'contact')
    \`).all();
    
    const formatted = {};
    settings.forEach(s => {
      let val = s.value;
      if (s.type === 'json' && val) {
        try { val = JSON.parse(val); } catch (e) {}
      } else if (s.type === 'number' && val) {
        val = parseFloat(val);
      }
      formatted[s.key] = val;
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/:key', (req, res, next) => {
  try {
    const db = getDb();
    const setting = db.prepare('SELECT value, type FROM settings WHERE key = ?').get(req.params.key);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'غير موجود' });
    }
    
    let val = setting.value;
    if (setting.type === 'json' && val) {
      try { val = JSON.parse(val); } catch (e) {}
    } else if (setting.type === 'number' && val) {
      val = parseFloat(val);
    }
    
    res.json({ success: true, data: { key: req.params.key, value: val } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'notifications.js': `const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination, paginationInfo } = require('../../utils/helpers');

// Note: In a real app this might be protected, but keeping open for simplicity as per requirements
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    
    const totalItems = db.prepare('SELECT COUNT(*) as total FROM notifications').get().total;
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;

    res.json({ 
      success: true, 
      data: notifications,
      unreadCount,
      pagination: paginationInfo(page, limit, totalItems)
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(apiDir, filename), content);
  console.log('Created ' + filename);
}
console.log('All API routes created successfully.');
