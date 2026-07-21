const router = require('express').Router();
const { getDb } = require('../../config/database');

/**
 * Clean phone number format
 */
function normalizePhone(str) {
  return String(str || '').replace(/[^\d+]/g, '');
}

/**
 * Login or Quick Register Customer (No password / OTP required)
 */
router.post('/login', (req, res, next) => {
  try {
    const db = getDb();
    const { name, phone, email, city, address } = req.body;
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رقم الهاتف' });
    }

    // Split name if provided
    const nameParts = String(name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'عميل';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Check if customer exists
    let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(cleanPhone);

    if (!customer) {
      // Create new customer
      const result = db.prepare(`
        INSERT INTO customers (first_name, last_name, phone, email, city, address_detail, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(firstName, lastName, cleanPhone, email || '', city || '', address || '');

      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    } else if (name || email || city || address) {
      // Update customer info if provided
      db.prepare(`
        UPDATE customers
        SET first_name = COALESCE(NULLIF(?, ''), first_name),
            last_name = COALESCE(NULLIF(?, ''), last_name),
            email = COALESCE(NULLIF(?, ''), email),
            city = COALESCE(NULLIF(?, ''), city),
            address_detail = COALESCE(NULLIF(?, ''), address_detail),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(firstName, lastName, email || '', city || '', address || '', customer.id);

      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
    }

    req.session.customer = {
      id: customer.id,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      email: customer.email,
      city: customer.city,
      district: customer.district,
      addressDetail: customer.address_detail
    };

    res.json({
      success: true,
      data: req.session.customer
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Register Customer
 */
router.post('/register', (req, res, next) => {
  req.url = '/login';
  router.handle(req, res, next);
});

/**
 * Get current logged in customer
 */
router.get('/me', (req, res, next) => {
  try {
    const db = getDb();
    const phone = req.query.phone || req.session.customer?.phone;
    
    if (!phone) {
      return res.json({ success: true, data: null });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(normalizePhone(phone));
    if (!customer) {
      return res.json({ success: true, data: null });
    }

    const profile = {
      id: customer.id,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      email: customer.email,
      city: customer.city,
      district: customer.district,
      addressDetail: customer.address_detail,
      totalOrders: customer.total_orders || 0,
      totalSpent: customer.total_spent || 0
    };

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

/**
 * Update Customer Profile
 */
router.post('/profile', (req, res, next) => {
  try {
    const db = getDb();
    const { phone, firstName, lastName, email, city, district, addressDetail } = req.body;
    const cleanPhone = normalizePhone(phone || req.session.customer?.phone);

    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'تعذر العثور على حساب المستخدم' });
    }

    db.prepare(`
      UPDATE customers
      SET first_name = ?, last_name = ?, email = ?, city = ?, district = ?, address_detail = ?, updated_at = datetime('now')
      WHERE phone = ?
    `).run(firstName || '', lastName || '', email || '', city || '', district || '', addressDetail || '', cleanPhone);

    const updated = db.prepare('SELECT * FROM customers WHERE phone = ?').get(cleanPhone);
    const profile = {
      id: updated.id,
      name: `${updated.first_name || ''} ${updated.last_name || ''}`.trim(),
      firstName: updated.first_name,
      lastName: updated.last_name,
      phone: updated.phone,
      email: updated.email,
      city: updated.city,
      district: updated.district,
      addressDetail: updated.address_detail
    };

    req.session.customer = profile;
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    delete req.session.customer;
  }
  res.json({ success: true });
});

module.exports = router;
