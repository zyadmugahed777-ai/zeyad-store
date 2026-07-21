const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');
const { setFlash } = require('../../middleware/auth');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.q || '';
    const status = req.query.status || '';

    let query = `
      SELECT o.*, c.first_name, c.phone 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (o.order_id LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
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
    const order = db.prepare(`
      SELECT o.*, c.first_name, c.last_name, c.phone, c.email 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE o.id = ?
    `).get(req.params.id);
    
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

module.exports = router;