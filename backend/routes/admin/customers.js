const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');

// List
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.q || '';

    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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

// Detail
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.redirect('/admin/customers');

    const orders = db.prepare(`
      SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC
    `).all(customer.id);

    res.render('admin/customers/detail', {
      title: 'العميل: ' + (customer.first_name || '') + ' ' + (customer.last_name || ''),
      active: 'customers',
      customer,
      orders
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;