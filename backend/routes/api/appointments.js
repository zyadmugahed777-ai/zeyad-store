const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, branch, date, time, visitType, city, notes } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    const result = db.prepare(`
      INSERT INTO appointments (full_name, phone, branch, date, time, visit_type, city, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sanitize(fullName), normalizePhone(phone), sanitize(branch), sanitize(date), sanitize(time), sanitize(visitType), sanitize(city), sanitize(notes));

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'appointment', result.lastInsertRowid, 'حجز موعد جديد', `موعد جديد: ${sanitize(fullName)}`
    );

    res.json({ success: true, message: 'تم حجز الموعد بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;