const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, designType, dimensions, budget, stylePref, details } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    const result = db.prepare(`
      INSERT INTO design_requests (full_name, phone, design_type, dimensions, budget, style_pref, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sanitize(fullName), normalizePhone(phone), sanitize(designType), sanitize(dimensions), sanitize(budget), sanitize(stylePref), sanitize(details));

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'design', result.lastInsertRowid, 'طلب تصميم جديد', `طلب تصميم (${sanitize(designType)}) من: ${sanitize(fullName)}`
    );

    res.json({ success: true, message: 'تم إرسال طلب التصميم بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;